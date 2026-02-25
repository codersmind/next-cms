/**
 * Strapi-like content type & field type definitions.
 * Attributes are stored as JSON in ContentType.attributes / Component.attributes.
 */

export const FIELD_TYPES = [
  "text",           // short | long
  "richtext",       // blocks (JSON)
  "richtext-markdown",
  "number",         // integer | biginteger | decimal | float
  "date",           // date | time | datetime
  "boolean",
  "json",
  "email",
  "password",
  "enumeration",
  "uid",            // attached to another field
  "media",          // single | multiple
  "relation",       // oneToOne, oneToMany, manyToOne, manyToMany, oneWay, manyWay
  "component",      // single | repeatable
  "dynamiczone",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export type RelationKind =
  | "oneToOne"
  | "oneToMany"
  | "manyToOne"
  | "manyToMany"
  | "oneWay"
  | "manyWay";

export interface AttributeBase {
  name: string;
  type: FieldType;
  required?: boolean;
  unique?: boolean;
  private?: boolean;
  /** Display label in admin (defaults to name) */
  label?: string;
  /** CSS class for admin form wrapper */
  className?: string;
  /** Help text / description */
  description?: string;
}

export interface TextAttribute extends AttributeBase {
  type: "text";
  default?: string;
  maxLength?: number; // 255 for short
}

export interface RichTextAttribute extends AttributeBase {
  type: "richtext" | "richtext-markdown";
}

export interface NumberAttribute extends AttributeBase {
  type: "number";
  numberFormat?: "integer" | "biginteger" | "decimal" | "float";
  min?: number;
  max?: number;
  default?: number;
}

export interface DateAttribute extends AttributeBase {
  type: "date";
  dateType?: "date" | "time" | "datetime";
}

export interface EnumAttribute extends AttributeBase {
  type: "enumeration";
  enum?: string[];
  enumName?: string;
  /** Default value (must be one of enum values) */
  default?: string;
}

export interface UidAttribute extends AttributeBase {
  type: "uid";
  attachedField?: string;
}

export interface MediaAttribute extends AttributeBase {
  type: "media";
  allowedTypes?: string[];
  multiple?: boolean;
}

export interface RelationAttribute extends AttributeBase {
  type: "relation";
  relation: RelationKind;
  target?: string;   // content type singularId
  targetModel?: string;
  inverseField?: string;
  mappedBy?: string;
}

export interface ComponentAttribute extends AttributeBase {
  type: "component";
  component: string; // e.g. "shared.seo"
  repeatable?: boolean;
}

export interface DynamicZoneAttribute extends AttributeBase {
  type: "dynamiczone";
  components: string[]; // e.g. ["blog.hero", "blog.paragraph"]
}

export type Attribute =
  | AttributeBase
  | TextAttribute
  | RichTextAttribute
  | NumberAttribute
  | DateAttribute
  | EnumAttribute
  | UidAttribute
  | MediaAttribute
  | RelationAttribute
  | ComponentAttribute
  | DynamicZoneAttribute;

export interface ContentTypeSchema {
  kind: "collectionType" | "singleType";
  displayName: string;
  singularName: string;
  pluralName: string;
  description?: string;
  draftPublish?: boolean;
  i18n?: boolean;
  attributes: Attribute[];
}

export interface ComponentSchema {
  displayName: string;
  category: string;
  icon?: string;
  attributes: Attribute[];
}
