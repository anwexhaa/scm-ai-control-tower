import os
import json
import pandas as pd
from io import StringIO
from typing import Optional
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")

# ─────────────────────────────────────────────
# SCHEMA DEFINITIONS
# What each file type expects after normalization
# ─────────────────────────────────────────────

SCHEMAS = {
    "inventory": {
        "required": ["product_id", "product_name", "quantity_in_stock", "reorder_threshold"],
        "optional": ["warehouse", "supplier_info", "unit_cost", "avg_daily_consumption", "lead_time_days"]
    },
    "supplier": {
        "required": ["supplier_name", "base_cost_per_unit", "on_time_delivery_rate", "lead_time_days", "quality_rating"],
        "optional": ["historical_issues", "contact_info"]
    },
    "shipment": {
        "required": ["shipment_id", "expected_delivery"],
        "optional": ["product_id", "quantity", "supplier", "carrier", "actual_delivery", "is_on_time", "carrier_avg_delay"]
    }
}


# ─────────────────────────────────────────────
# STEP 1: Detect file type from headers + sample
# ─────────────────────────────────────────────

async def detect_file_type(headers: list[str], sample_rows: list[dict]) -> str:
    """
    Ask Gemini what kind of file this is based on headers and sample data.
    Returns: "inventory" | "supplier" | "shipment"
    """
    prompt = f"""
You are a supply chain data expert. Given these CSV headers and sample rows, 
identify what type of supply chain data this file contains.

Headers: {headers}
Sample rows (first 3): {json.dumps(sample_rows[:3], default=str)}

Choose EXACTLY one of these types:
- inventory: contains product stock levels, quantities, reorder points
- supplier: contains supplier/vendor information, costs, delivery rates
- shipment: contains order/shipment tracking, delivery dates, carriers

Respond with ONLY the type word, nothing else. Example: inventory
"""
    response = await model.generate_content_async(prompt)
    file_type = response.text.strip().lower()

    if file_type not in ["inventory", "supplier", "shipment"]:
        # Fallback: guess from headers
        header_str = " ".join(headers).lower()
        if any(w in header_str for w in ["stock", "quantity", "reorder", "product"]):
            return "inventory"
        elif any(w in header_str for w in ["supplier", "vendor", "cost_per", "delivery_rate"]):
            return "supplier"
        elif any(w in header_str for w in ["shipment", "carrier", "tracking", "delivery_date"]):
            return "shipment"
        return "inventory"  # last resort default

    return file_type


# ─────────────────────────────────────────────
# STEP 2: Map raw columns to schema fields
# ─────────────────────────────────────────────

async def map_columns_with_gemini(
    headers: list[str],
    sample_rows: list[dict],
    file_type: str
) -> dict:
    """
    Uses Gemini to map the raw CSV headers to the target schema fields.
    Returns a dict like: {"raw_column": "schema_field", ...}
    Only maps columns that have a clear match — unmapped columns are ignored.
    """
    schema = SCHEMAS[file_type]
    all_fields = schema["required"] + schema["optional"]

    prompt = f"""
You are a supply chain data normalization expert.

I have a CSV file of type "{file_type}" with these headers:
{headers}

Sample data (first 3 rows):
{json.dumps(sample_rows[:3], default=str)}

Map each raw CSV header to the most appropriate field from this target schema:
Required fields: {schema["required"]}
Optional fields: {schema["optional"]}

Rules:
1. Only map headers that clearly correspond to a schema field
2. Each schema field can only be mapped ONCE (use the best match)
3. If a header doesn't match any schema field, omit it
4. For boolean fields like is_on_time, values like "yes/no", "1/0", "true/false" all count
5. Return ONLY valid JSON, no explanation, no markdown, no backticks

Expected output format:
{{"raw_header_name": "schema_field_name", "another_header": "another_field"}}

Example:
{{"units_available": "quantity_in_stock", "sku_code": "product_id", "item_name": "product_name"}}
"""
    response = await model.generate_content_async(prompt)
    raw = response.text.strip()

    # Strip markdown if Gemini adds backticks anyway
    raw = raw.replace("```json", "").replace("```", "").strip()

    try:
        mapping = json.loads(raw)
        # Validate — only keep mappings to known schema fields
        valid_mapping = {
            k: v for k, v in mapping.items()
            if v in all_fields and k in headers
        }
        return valid_mapping
    except json.JSONDecodeError:
        # Fallback: return empty mapping, let conflict detection catch missing required fields
        return {}


# ─────────────────────────────────────────────
# STEP 3: Apply mapping + normalize values
# ─────────────────────────────────────────────

def apply_mapping_and_normalize(
    df: pd.DataFrame,
    mapping: dict,
    file_type: str
) -> tuple[list[dict], list[str]]:
    """
    Applies the column mapping to the dataframe and normalizes values.
    Returns:
        - normalized_rows: list of dicts with schema field names
        - missing_required: list of required fields not found in mapping
    """
    schema = SCHEMAS[file_type]

    # Rename columns per mapping
    df_renamed = df.rename(columns=mapping)

    # Check which required fields are present
    missing_required = [
        field for field in schema["required"]
        if field not in df_renamed.columns
    ]

    # Build normalized rows — only include schema fields
    all_fields = schema["required"] + schema["optional"]
    available_fields = [f for f in all_fields if f in df_renamed.columns]

    normalized_rows = []
    for _, row in df_renamed.iterrows():
        record = {}
        for field in available_fields:
            val = row[field]

            # Normalize booleans
            if field == "is_on_time":
                if str(val).lower() in ["1", "true", "yes"]:
                    val = True
                elif str(val).lower() in ["0", "false", "no"]:
                    val = False
                else:
                    val = None

            # Normalize numeric fields
            elif field in ["quantity_in_stock", "reorder_threshold", "lead_time_days",
                           "historical_issues", "quantity"]:
                try:
                    val = int(float(str(val).replace(",", "")))
                except (ValueError, TypeError):
                    val = None

            elif field in ["unit_cost", "avg_daily_consumption", "base_cost_per_unit",
                           "on_time_delivery_rate", "quality_rating", "carrier_avg_delay"]:
                try:
                    val = float(str(val).replace(",", "").replace("$", ""))
                except (ValueError, TypeError):
                    val = None

            # Normalize strings
            elif isinstance(val, float) and pd.isna(val):
                val = None
            else:
                val = str(val).strip() if val is not None else None

            record[field] = val

        normalized_rows.append(record)

    return normalized_rows, missing_required


# ─────────────────────────────────────────────
# STEP 4: Detect conflicts with existing DB data
# ─────────────────────────────────────────────

def detect_conflicts(
    incoming_rows: list[dict],
    existing_rows: list[dict],
    file_type: str,
    existing_file_id: str,
    incoming_file_id: str
) -> list[dict]:
    """
    Compares incoming normalized rows against existing DB records.
    Returns a list of conflict dicts for any fields that differ.

    Name-matching is done on:
      inventory → product_name
      supplier  → supplier_name
      shipment  → shipment_id
    """
    name_key = {
        "inventory": "product_name",
        "supplier":  "supplier_name",
        "shipment":  "shipment_id"
    }[file_type]

    # Fields to compare (skip IDs and timestamps)
    compare_fields = {
        "inventory": ["quantity_in_stock", "reorder_threshold", "unit_cost",
                      "avg_daily_consumption", "lead_time_days", "warehouse"],
        "supplier":  ["base_cost_per_unit", "on_time_delivery_rate", "lead_time_days",
                      "quality_rating", "historical_issues"],
        "shipment":  ["carrier", "expected_delivery", "quantity", "supplier", "carrier_avg_delay"]
    }[file_type]

    # Index existing rows by name key
    existing_index = {
        row.get(name_key, "").lower(): row
        for row in existing_rows
        if row.get(name_key)
    }

    conflicts = []
    for incoming in incoming_rows:
        name = str(incoming.get(name_key, "")).lower()
        if name in existing_index:
            existing = existing_index[name]
            for field in compare_fields:
                incoming_val = incoming.get(field)
                existing_val = existing.get(field)
                # Only flag if both have a value and they differ
                if (incoming_val is not None and existing_val is not None
                        and str(incoming_val) != str(existing_val)):
                    conflicts.append({
                        "table_name":   file_type,
                        "product_name": incoming.get(name_key),
                        "file_id_a":    existing_file_id,
                        "file_id_b":    incoming_file_id,
                        "field_name":   field,
                        "value_a":      str(existing_val),
                        "value_b":      str(incoming_val),
                        "resolution":   None
                    })

    return conflicts


# ─────────────────────────────────────────────
# MASTER FUNCTION: Full normalization pipeline
# ─────────────────────────────────────────────

async def run_normalization_pipeline(
    csv_content: str,
    file_id: str,
    existing_db_rows: list[dict],
    existing_file_id: Optional[str] = None
) -> dict:
    """
    Full pipeline:
    1. Parse CSV
    2. Detect file type
    3. Map columns with Gemini
    4. Apply mapping + normalize
    5. Detect conflicts

    Returns a preview dict ready to send to the frontend for confirmation.
    """
    # Parse CSV
    df = pd.read_csv(StringIO(csv_content))
    df.columns = [c.strip() for c in df.columns]  # clean whitespace from headers
    headers = list(df.columns)
    sample_rows = df.head(3).to_dict(orient="records")

    # Step 1: Detect file type
    file_type = await detect_file_type(headers, sample_rows)

    # Step 2: Map columns
    mapping = await map_columns_with_gemini(headers, sample_rows, file_type)

    # Step 3: Normalize
    normalized_rows, missing_required = apply_mapping_and_normalize(df, mapping, file_type)

    # Step 4: Conflicts
    conflicts = []
    if existing_db_rows and existing_file_id:
        conflicts = detect_conflicts(
            incoming_rows=normalized_rows,
            existing_rows=existing_db_rows,
            file_type=file_type,
            existing_file_id=existing_file_id,
            incoming_file_id=file_id
        )

    return {
        "file_id":          file_id,
        "file_type":        file_type,
        "total_rows":       len(normalized_rows),
        "column_mapping":   mapping,
        "missing_required": missing_required,
        "preview_rows":     normalized_rows[:5],  # first 5 for frontend display
        "all_rows":         normalized_rows,       # full data kept in memory until commit
        "conflicts":        conflicts,
        "can_commit":       len(missing_required) == 0
    }