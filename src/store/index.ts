import { configureStore } from "@reduxjs/toolkit";
import { cmsApi } from "./api/cmsApi";

export const store = configureStore({
  reducer: {
    [cmsApi.reducerPath]: cmsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(cmsApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
