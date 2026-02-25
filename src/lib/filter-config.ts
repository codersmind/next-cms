/**
 * Advanced filter UI config: operators per field type and mapping to API operators.
 */

export type FilterOpKey =
  | "eq"
  | "ne"
  | "containsi"
  | "stWithi"
  | "endWithi"
  | "empty"
  | "notEmpty"
  | "lt"
  | "lte"
  | "gt"
  | "gte"
  | "between"
  | "in"
  | "notIn";

export interface FilterOpOption {
  value: FilterOpKey;
  label: string;
  needsValue: boolean;
  valueLabel?: string;
}

const TEXT_OPS: FilterOpOption[] = [
  { value: "containsi", label: "contains", needsValue: true },
  { value: "stWithi", label: "starts with", needsValue: true },
  { value: "endWithi", label: "ends with", needsValue: true },
  { value: "eq", label: "equals", needsValue: true },
  { value: "ne", label: "not equals", needsValue: true },
  { value: "empty", label: "is empty", needsValue: false },
  { value: "notEmpty", label: "is not empty", needsValue: false },
];

const NUMBER_OPS: FilterOpOption[] = [
  { value: "eq", label: "equals", needsValue: true },
  { value: "ne", label: "not equals", needsValue: true },
  { value: "lt", label: "less than", needsValue: true },
  { value: "lte", label: "less or equal", needsValue: true },
  { value: "gt", label: "greater than", needsValue: true },
  { value: "gte", label: "greater or equal", needsValue: true },
  { value: "between", label: "between", needsValue: true, valueLabel: "min,max" },
  { value: "empty", label: "is empty", needsValue: false },
  { value: "notEmpty", label: "is not empty", needsValue: false },
];

const DATE_OPS: FilterOpOption[] = [
  { value: "eq", label: "equals", needsValue: true },
  { value: "lt", label: "before", needsValue: true },
  { value: "lte", label: "on or before", needsValue: true },
  { value: "gt", label: "after", needsValue: true },
  { value: "gte", label: "on or after", needsValue: true },
  { value: "between", label: "between", needsValue: true, valueLabel: "from,to" },
  { value: "empty", label: "is not set", needsValue: false },
  { value: "notEmpty", label: "is set", needsValue: false },
];

const BOOLEAN_OPS: FilterOpOption[] = [
  { value: "eq", label: "is true", needsValue: false },
  { value: "ne", label: "is false", needsValue: false },
  { value: "empty", label: "is not set", needsValue: false },
  { value: "notEmpty", label: "is set", needsValue: false },
];

const ENUM_OPS: FilterOpOption[] = [
  { value: "eq", label: "equals", needsValue: true },
  { value: "ne", label: "not equals", needsValue: true },
  { value: "in", label: "in list", needsValue: true, valueLabel: "comma-separated" },
  { value: "notIn", label: "not in list", needsValue: true, valueLabel: "comma-separated" },
];

const OP_TO_API: Record<string, string> = {
  eq: "$eq",
  ne: "$ne",
  containsi: "$containsi",
  stWithi: "$startsWithi",
  endWithi: "$endsWithi",
  empty: "$empty",
  notEmpty: "$notEmpty",
  lt: "$lt",
  lte: "$lte",
  gt: "$gt",
  gte: "$gte",
  between: "$between",
  in: "$in",
  notIn: "$notIn",
};

export function getOperatorsForFieldType(
  type: string,
  _attr?: { enum?: string[] }
): FilterOpOption[] {
  switch (type) {
    case "text":
    case "richtext":
    case "richtext-markdown":
    case "email":
    case "uid":
      return TEXT_OPS;
    case "number":
    case "integer":
    case "float":
    case "decimal":
    case "biginteger":
      return NUMBER_OPS;
    case "date":
    case "datetime":
    case "time":
    case "createdAt":
    case "updatedAt":
      return DATE_OPS;
    case "boolean":
      return BOOLEAN_OPS;
    case "enumeration":
      return ENUM_OPS;
    case "documentId":
      return TEXT_OPS;
    default:
      return [...TEXT_OPS, ...NUMBER_OPS].filter(
        (o, i, arr) => arr.findIndex((x) => x.value === o.value) === i
      );
  }
}

export function getFieldType(
  fieldKey: string,
  attributes: { name: string; type: string; enum?: string[] }[]
): string {
  if (fieldKey === "documentId") return "documentId";
  if (fieldKey === "createdAt" || fieldKey === "updatedAt") return fieldKey;
  const attr = attributes.find((a) => a.name === fieldKey);
  return attr?.type ?? "text";
}

export function filterOpToApi(op: string): string {
  return OP_TO_API[op] ?? "$eq";
}

/** Build API filters object from UI filter rows (AND of all rows). */
export function buildFiltersFromRows(
  rows: { field: string; operator: string; value: string }[]
): Record<string, unknown> | undefined {
  const out: Record<string, unknown> = {};
  for (const row of rows) {
    if (!row.field) continue;
    const apiOp = filterOpToApi(row.operator);
    let apiValue: unknown;
    if (row.operator === "empty" || row.operator === "notEmpty") {
      apiValue = true;
    } else if (row.operator === "eq" && row.value === "true") {
      apiValue = true;
    } else if (row.operator === "eq" && row.value === "false") {
      apiValue = false;
    } else if (row.operator === "ne" && row.value === "true") {
      apiValue = true;
    } else if (row.operator === "ne" && row.value === "false") {
      apiValue = false;
    } else if (row.operator === "between") {
      const parts = String(row.value).split(",").map((s) => s.trim());
      const isDate = ["date", "createdat", "updatedat"].some((t) =>
        row.field.toLowerCase().includes(t)
      );
      if (parts.length >= 2) {
        apiValue = isDate ? [parts[0], parts[1]] : [Number(parts[0]) || parts[0], Number(parts[1]) || parts[1]];
      } else continue;
    } else if (row.operator === "in" || row.operator === "notIn") {
      apiValue = String(row.value)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if ((apiValue as string[]).length === 0) continue;
    } else if (row.operator === "eq" || row.operator === "ne") {
      const v = row.value.trim();
      if (v === "true") apiValue = true;
      else if (v === "false") apiValue = false;
      else if (v !== "" && !Number.isNaN(Number(v))) apiValue = Number(v);
      else apiValue = v || null;
    } else if (["lt", "lte", "gt", "gte"].includes(row.operator)) {
      const v = row.value.trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(v)) apiValue = v;
      else if (v !== "" && !Number.isNaN(Number(v))) apiValue = Number(v);
      else apiValue = v;
    } else {
      apiValue = row.value.trim() || null;
    }
    out[row.field] = { [apiOp]: apiValue };
  }
  return Object.keys(out).length === 0 ? undefined : out;
}
