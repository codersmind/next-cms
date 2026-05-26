import type { WebhookInboundActions } from "./webhook-inbound-actions";

export type AttributeHint = {
  name: string;
  type: string;
  enum?: string[];
};

/** Build inbound action defaults from a content type's field schema (any collection/single type). */
export function suggestInboundActionForContentType(
  pluralId: string,
  attributes: AttributeHint[]
): NonNullable<WebhookInboundActions["updateDocument"]> {
  const names = new Set(attributes.map((a) => a.name));

  const documentIdPath = names.has("documentId")
    ? "documentId"
    : names.has("entryId")
      ? "entryId"
      : names.has("id")
        ? "id"
        : "documentId";

  const boolField = attributes.find((a) => a.type === "boolean");
  const statusLike = attributes.find(
    (a) =>
      a.type === "enumeration" ||
      (a.type === "text" && /status|state|phase|step/i.test(a.name))
  );

  const fieldUpdates: Record<string, unknown> = {};

  if (boolField) {
    fieldUpdates[boolField.name] = true;
  }

  if (statusLike) {
    if (statusLike.type === "enumeration" && statusLike.enum?.length) {
      const match =
        statusLike.enum.find((v) =>
          /paid|success|complete|done|active|shipped|approved/i.test(String(v))
        ) ?? statusLike.enum[0];
      fieldUpdates[statusLike.name] = match;
    } else {
      fieldUpdates[statusLike.name] = "completed";
    }
  }

  if (Object.keys(fieldUpdates).length === 0 && attributes.length > 0) {
    const firstScalar = attributes.find((a) =>
      ["text", "number", "boolean", "enumeration", "email"].includes(a.type)
    );
    if (firstScalar) {
      if (firstScalar.type === "boolean") fieldUpdates[firstScalar.name] = true;
      else if (firstScalar.type === "number") fieldUpdates[firstScalar.name] = 1;
      else fieldUpdates[firstScalar.name] = "updated";
    }
  }

  if (Object.keys(fieldUpdates).length === 0) {
    fieldUpdates.status = "updated";
  }

  let successPath: string | undefined;
  let successValue: string | undefined;
  if (boolField) {
    successPath = boolField.name;
    successValue = "true";
  } else if (statusLike) {
    successPath = statusLike.name;
    successValue = String(fieldUpdates[statusLike.name] ?? "completed");
  }

  return {
    enabled: true,
    contentType: pluralId,
    documentIdPath,
    successPath,
    successValue,
    fieldUpdates,
    copyFromPayload: {},
    publish: false,
  };
}

export function defaultInboundDocumentActions(
  pluralId: string,
  attributes: AttributeHint[] = []
): WebhookInboundActions {
  if (attributes.length > 0) {
    return { updateDocument: suggestInboundActionForContentType(pluralId, attributes) };
  }
  return {
    updateDocument: {
      enabled: true,
      contentType: pluralId,
      documentIdPath: "documentId",
      fieldUpdates: { status: "updated" },
      copyFromPayload: {},
      publish: false,
    },
  };
}
