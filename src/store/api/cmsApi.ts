import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "../baseQuery";

export interface ContentTypeAttribute {
  name: string;
  type: string;
  required?: boolean;
  [key: string]: unknown;
}

export interface ContentType {
  id: string;
  name: string;
  singularId: string;
  pluralId: string;
  kind: string;
  description: string | null;
  draftPublish: boolean;
  defaultPublicationState: "draft" | "published";
  i18n: boolean;
  attributes: ContentTypeAttribute[];
}

export interface Component {
  id: string;
  name: string;
  category: string;
  icon: string | null;
  attributes: ContentTypeAttribute[];
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginResponse {
  jwt: string;
  user: { id: string; email: string; username?: string; firstname?: string; lastname?: string };
}

export interface DocumentListResponse {
  data: unknown[];
  meta: { pagination: { page: number; pageSize: number; pageCount: number; total: number } };
}

export interface DocumentResponse {
  data: unknown;
  meta: object;
}

export interface MediaFile {
  id: string;
  name: string;
  hash: string;
  folder?: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  width: number | null;
  height: number | null;
}

export interface ContentTypeTemplate {
  id: string;
  name: string;
  description: string | null;
  schema: { kind: string; attributes: ContentTypeAttribute[] };
}

export interface AdminUser {
  id: string;
  email: string;
  username: string | null;
  firstname: string | null;
  lastname: string | null;
  blocked: boolean;
  roleId: string | null;
  roleName?: string | null;
  createdAt?: string;
}

export interface AdminRole {
  id: string;
  name: string;
  description: string | null;
  type: string | null;
  usersCount?: number;
  permissionsCount?: number;
}

export interface AdminPermission {
  id: string;
  action: string;
  roleId: string;
  role?: { id: string; name: string };
  enabled: boolean;
}

export const cmsApi = createApi({
  reducerPath: "cmsApi",
  baseQuery,
  tagTypes: ["ContentTypes", "Components", "Documents", "Media", "MediaFolders", "Templates", "Users", "Roles", "Permissions"],
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({
        url: "/api/auth/login",
        method: "POST",
        body,
      }),
    }),

    getContentTypes: builder.query<ContentType[], void>({
      query: () => "/api/content-types",
      transformResponse: (raw: ContentType[]) =>
        raw.map((t) => ({
          ...t,
          attributes: typeof t.attributes === "string" ? JSON.parse(t.attributes) : t.attributes,
        })),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "ContentTypes" as const, id })),
              { type: "ContentTypes", id: "LIST" },
            ]
          : [{ type: "ContentTypes", id: "LIST" }],
    }),

    getContentType: builder.query<ContentType, string>({
      query: (id) => `/api/content-types/${id}`,
      transformResponse: (raw: ContentType) => ({
        ...raw,
        attributes: typeof raw.attributes === "string" ? JSON.parse(raw.attributes) : raw.attributes,
      }),
      providesTags: (_result, _err, id) => [{ type: "ContentTypes", id }],
    }),

    createContentType: builder.mutation<
      ContentType,
      { name: string; singularId?: string; pluralId?: string; kind: "collectionType" | "singleType"; description?: string; draftPublish?: boolean; defaultPublicationState?: "draft" | "published"; i18n?: boolean; attributes: ContentTypeAttribute[] }
    >({
      query: (body) => ({
        url: "/api/content-types",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "ContentTypes", id: "LIST" }],
    }),

    updateContentType: builder.mutation<
      ContentType,
      { id: string } & Partial<{ name: string; singularId: string; pluralId: string; kind: string; description: string; draftPublish: boolean; defaultPublicationState: "draft" | "published"; i18n: boolean; attributes: ContentTypeAttribute[] }>
    >({
      query: ({ id, ...body }) => ({
        url: `/api/content-types/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _err, { id }) => [{ type: "ContentTypes", id }, { type: "ContentTypes", id: "LIST" }],
    }),

    deleteContentType: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/api/content-types/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "ContentTypes", id: "LIST" }],
    }),

    getComponents: builder.query<Component[], void>({
      query: () => "/api/content-types/components",
      transformResponse: (raw: Component[]) =>
        raw.map((c) => ({
          ...c,
          attributes: typeof c.attributes === "string" ? JSON.parse(c.attributes) : c.attributes,
        })),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Components" as const, id })),
              { type: "Components", id: "LIST" },
            ]
          : [{ type: "Components", id: "LIST" }],
    }),

    getComponent: builder.query<Component, string>({
      query: (id) => `/api/content-types/components/${id}`,
      transformResponse: (raw: Component) => ({
        ...raw,
        attributes: typeof raw.attributes === "string" ? JSON.parse(raw.attributes) : raw.attributes,
      }),
      providesTags: (_result, _err, id) => [{ type: "Components", id }],
    }),

    createComponent: builder.mutation<
      Component,
      { name: string; category: string; icon?: string; attributes: ContentTypeAttribute[] }
    >({
      query: (body) => ({
        url: "/api/content-types/components",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Components", id: "LIST" }],
    }),

    updateComponent: builder.mutation<
      Component,
      { id: string } & Partial<{ name: string; category: string; icon: string; attributes: ContentTypeAttribute[] }>
    >({
      query: ({ id, ...body }) => ({
        url: `/api/content-types/components/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _err, { id }) => [{ type: "Components", id }, { type: "Components", id: "LIST" }],
    }),

    getDocuments: builder.query<
      DocumentListResponse,
      {
        contentType: string;
        page?: number;
        pageSize?: number;
        sort?: string | string[];
        search?: string;
        searchField?: string;
        filters?: Record<string, unknown>;
        status?: "draft" | "published" | "scheduled";
      }
    >({
      query: ({ contentType, page, pageSize, sort, search, searchField, filters, status }) => {
        const params = new URLSearchParams();
        params.set("contentType", contentType);
        if (page != null) params.set("pagination[page]", String(page));
        if (pageSize != null) params.set("pagination[pageSize]", String(pageSize));
        if (sort != null) {
          params.set("sort", Array.isArray(sort) ? JSON.stringify(sort) : sort);
        }
        if (search != null && search !== "") params.set("_q", search);
        if (searchField != null && searchField !== "") params.set("searchField", searchField);
        if (filters != null && Object.keys(filters).length > 0) {
          params.set("filters", JSON.stringify(filters));
        }
        if (status) params.set("status", status);
        return { url: `/api/content-manager/documents?${params.toString()}` };
      },
      providesTags: (_result, _err, { contentType }) => [{ type: "Documents", id: contentType }],
    }),

    getDocument: builder.query<
      DocumentResponse,
      { contentType: string; documentId: string }
    >({
      query: ({ contentType, documentId }) =>
        `/api/content-manager/documents/${documentId}?contentType=${encodeURIComponent(contentType)}`,
      providesTags: (_result, _err, { contentType, documentId }) => [
        { type: "Documents", id: `${contentType}-${documentId}` },
      ],
    }),

    createDocument: builder.mutation<
      DocumentResponse,
      { contentType: string; data: Record<string, unknown>; publishedAt?: string | null }
    >({
      query: ({ contentType, data, publishedAt }) => ({
        url: "/api/content-manager/documents",
        method: "POST",
        body: { contentType, data, ...(publishedAt !== undefined && { publishedAt }) },
      }),
      invalidatesTags: (_result, _err, { contentType }) => [{ type: "Documents", id: contentType }],
    }),

    updateDocument: builder.mutation<
      DocumentResponse,
      { contentType: string; documentId: string; data: Record<string, unknown>; publishedAt?: string | null }
    >({
      query: ({ contentType, documentId, data, publishedAt }) => ({
        url: `/api/content-manager/documents/${documentId}?contentType=${encodeURIComponent(contentType)}`,
        method: "PUT",
        body: { data, ...(publishedAt !== undefined && { publishedAt }) },
      }),
      invalidatesTags: (_result, _err, { contentType, documentId }) => [
        { type: "Documents", id: contentType },
        { type: "Documents", id: `${contentType}-${documentId}` },
      ],
    }),

    deleteDocument: builder.mutation<void, { contentType: string; documentId: string }>({
      query: ({ contentType, documentId }) => ({
        url: `/api/content-manager/documents/${documentId}?contentType=${encodeURIComponent(contentType)}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _err, { contentType }) => [{ type: "Documents", id: contentType }],
    }),

    getMedia: builder.query<MediaFile[], string | void>({
      query: (folder) =>
        folder ? `/api/upload?folder=${encodeURIComponent(folder)}` : "/api/upload",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Media" as const, id })),
              { type: "Media", id: "LIST" },
            ]
          : [{ type: "Media", id: "LIST" }],
    }),

    getMediaFolders: builder.query<{ id: string; name: string; path: string }[], void>({
      query: () => "/api/upload/folders",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "MediaFolders" as const, id })),
              { type: "MediaFolders", id: "LIST" },
            ]
          : [{ type: "MediaFolders", id: "LIST" }],
    }),

    createMediaFolder: builder.mutation<
      { id: string; name: string; path: string },
      { name: string; parentPath?: string }
    >({
      query: (body) => ({
        url: "/api/upload/folders",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "MediaFolders", id: "LIST" }],
    }),

    deleteMediaFolder: builder.mutation<void, string>({
      query: (id) => ({
        url: `/api/upload/folders/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "MediaFolders", id: "LIST" }],
    }),

    getMediaList: builder.query<
      { data: MediaFile[]; meta: { pagination: { page: number; pageSize: number; pageCount: number; total: number } } },
      { page?: number; pageSize?: number; search?: string; filter?: "all" | "images" }
    >({
      query: ({ page = 1, pageSize = 24, search = "", filter = "all" }) => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
        if (search) params.set("search", search);
        if (filter !== "all") params.set("filter", filter);
        return { url: `/api/upload?${params.toString()}` };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: "Media" as const, id })),
              { type: "Media", id: "LIST" },
            ]
          : [{ type: "Media", id: "LIST" }],
    }),

    getMediaById: builder.query<MediaFile, string>({
      query: (id) => `/api/upload/${id}`,
      providesTags: (_result, _err, id) => [{ type: "Media", id }],
    }),

    uploadMedia: builder.mutation<MediaFile[], FormData>({
      query: (formData) => ({
        url: "/api/upload",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: [{ type: "Media", id: "LIST" }],
    }),

    deleteMedia: builder.mutation<void, string>({
      query: (id) => ({
        url: `/api/upload/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _err, id) => [{ type: "Media", id }, { type: "Media", id: "LIST" }],
    }),

    moveMedia: builder.mutation<MediaFile, { id: string; folder: string }>({
      query: ({ id, folder }) => ({
        url: `/api/upload/${id}`,
        method: "PATCH",
        body: { folder },
      }),
      invalidatesTags: (_result, _err, { id }) => [{ type: "Media", id }, { type: "Media", id: "LIST" }],
    }),

    getTemplates: builder.query<ContentTypeTemplate[], void>({
      query: () => "/api/templates",
      transformResponse: (raw: ContentTypeTemplate[]) =>
        raw.map((t) => ({
          ...t,
          schema: typeof t.schema === "string" ? JSON.parse(t.schema) : t.schema,
        })),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Templates" as const, id })),
              { type: "Templates", id: "LIST" },
            ]
          : [{ type: "Templates", id: "LIST" }],
    }),

    getAdminUsers: builder.query<
      { data: AdminUser[]; meta: { pagination: { page: number; pageSize: number; pageCount: number; total: number } } },
      { page?: number; pageSize?: number; search?: string; sort?: string; roleId?: string; blocked?: boolean }
    >({
      query: (params) => {
        const sp = new URLSearchParams();
        if (params.page != null) sp.set("page", String(params.page));
        if (params.pageSize != null) sp.set("pageSize", String(params.pageSize));
        if (params.search) sp.set("search", params.search);
        if (params.sort) sp.set("sort", params.sort);
        if (params.roleId) sp.set("roleId", params.roleId);
        if (params.blocked !== undefined) sp.set("blocked", String(params.blocked));
        return { url: `/api/admin/users?${sp.toString()}` };
      },
      providesTags: (result) =>
        result
          ? [...result.data.map(({ id }) => ({ type: "Users" as const, id })), { type: "Users", id: "LIST" }]
          : [{ type: "Users", id: "LIST" }],
    }),
    createAdminUser: builder.mutation<AdminUser, { email: string; username?: string; password: string; firstname?: string; lastname?: string; roleId?: string | null }>({
      query: (body) => ({ url: "/api/admin/users", method: "POST", body }),
      invalidatesTags: [{ type: "Users", id: "LIST" }],
    }),
    updateAdminUser: builder.mutation<
      AdminUser,
      { id: string; email?: string; username?: string; password?: string; firstname?: string; lastname?: string; blocked?: boolean; roleId?: string | null }
    >({
      query: ({ id, ...body }) => ({ url: `/api/admin/users/${id}`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Users", id }, { type: "Users", id: "LIST" }],
    }),
    deleteAdminUser: builder.mutation<void, string>({
      query: (id) => ({ url: `/api/admin/users/${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [{ type: "Users", id }, { type: "Users", id: "LIST" }],
    }),

    getAdminRoles: builder.query<AdminRole[], void>({
      query: () => "/api/admin/roles",
      providesTags: (result) =>
        result ? [...result.map(({ id }) => ({ type: "Roles" as const, id })), { type: "Roles", id: "LIST" }] : [{ type: "Roles", id: "LIST" }],
    }),
    createAdminRole: builder.mutation<AdminRole, { name: string; description?: string; type?: string }>({
      query: (body) => ({ url: "/api/admin/roles", method: "POST", body }),
      invalidatesTags: [{ type: "Roles", id: "LIST" }],
    }),
    updateAdminRole: builder.mutation<AdminRole, { id: string; name?: string; description?: string; type?: string }>({
      query: ({ id, ...body }) => ({ url: `/api/admin/roles/${id}`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Roles", id }, { type: "Roles", id: "LIST" }],
    }),
    deleteAdminRole: builder.mutation<void, string>({
      query: (id) => ({ url: `/api/admin/roles/${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [{ type: "Roles", id }, { type: "Roles", id: "LIST" }],
    }),

    getAdminPermissions: builder.query<AdminPermission[], string | void>({
      query: (roleId) => (roleId ? `/api/admin/permissions?roleId=${encodeURIComponent(roleId)}` : "/api/admin/permissions"),
      providesTags: (result) =>
        result ? [...result.map(({ id }) => ({ type: "Permissions" as const, id })), { type: "Permissions", id: "LIST" }] : [{ type: "Permissions", id: "LIST" }],
    }),
    createAdminPermission: builder.mutation<AdminPermission, { roleId: string; action: string; enabled?: boolean }>({
      query: (body) => ({ url: "/api/admin/permissions", method: "POST", body }),
      invalidatesTags: [{ type: "Permissions", id: "LIST" }],
    }),
    updateAdminPermission: builder.mutation<AdminPermission, { id: string; enabled?: boolean }>({
      query: ({ id, ...body }) => ({ url: `/api/admin/permissions/${id}`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Permissions", id }, { type: "Permissions", id: "LIST" }],
    }),
    deleteAdminPermission: builder.mutation<void, string>({
      query: (id) => ({ url: `/api/admin/permissions/${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [{ type: "Permissions", id }, { type: "Permissions", id: "LIST" }],
    }),
  }),
});

export const {
  useLoginMutation,
  useGetContentTypesQuery,
  useGetContentTypeQuery,
  useCreateContentTypeMutation,
  useUpdateContentTypeMutation,
  useDeleteContentTypeMutation,
  useGetComponentsQuery,
  useGetComponentQuery,
  useCreateComponentMutation,
  useUpdateComponentMutation,
  useGetDocumentsQuery,
  useGetDocumentQuery,
  useCreateDocumentMutation,
  useUpdateDocumentMutation,
  useDeleteDocumentMutation,
  useGetMediaQuery,
  useGetMediaListQuery,
  useGetMediaByIdQuery,
  useGetMediaFoldersQuery,
  useCreateMediaFolderMutation,
  useDeleteMediaFolderMutation,
  useUploadMediaMutation,
  useDeleteMediaMutation,
  useMoveMediaMutation,
  useGetTemplatesQuery,
  useGetAdminUsersQuery,
  useCreateAdminUserMutation,
  useUpdateAdminUserMutation,
  useDeleteAdminUserMutation,
  useGetAdminRolesQuery,
  useCreateAdminRoleMutation,
  useUpdateAdminRoleMutation,
  useDeleteAdminRoleMutation,
  useGetAdminPermissionsQuery,
  useCreateAdminPermissionMutation,
  useUpdateAdminPermissionMutation,
  useDeleteAdminPermissionMutation,
} = cmsApi;
