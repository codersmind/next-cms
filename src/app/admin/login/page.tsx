"use client";

import { useRouter } from "next/navigation";
import { Formik, Form, type FormikHelpers } from "formik";
import * as Yup from "yup";
import { useLoginMutation } from "@/store/api/cmsApi";
import { FormField } from "@/components/forms/FormField";

const loginSchema = Yup.object({
  identifier: Yup.string().required("Email or username is required"),
  password: Yup.string().required("Password is required"),
});

type LoginValues = Yup.InferType<typeof loginSchema>;

const initialValues: LoginValues = {
  identifier: "",
  password: "",
};

export default function LoginPage() {
  const [login, { error, isLoading }] = useLoginMutation();
  const router = useRouter();

  async function handleSubmit(
    values: LoginValues,
    _helpers: FormikHelpers<LoginValues>
  ) {
    try {
      const res = await login(values).unwrap();
      if (typeof window !== "undefined") {
        localStorage.setItem("jwt", res.jwt);
      }
      router.push("/admin");
      router.refresh();
    } catch {
      // error from mutation
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16 px-4">
      <h1 className="text-xl font-semibold mb-1">Admin Login</h1>
      <p className="text-muted mb-6">Sign in to access the admin panel.</p>
      <Formik
        initialValues={initialValues}
        validationSchema={loginSchema}
        onSubmit={handleSubmit}
      >
        <Form className="flex flex-col gap-4">
          <FormField
            name="identifier"
            label="Email or username"
            type="text"
            placeholder="admin@localhost"
          />
          <FormField
            name="password"
            label="Password"
            type="password"
          />
          {"error" in (error || {}) && (
            <p className="text-sm text-red-400">
              {(error as { data?: { error?: string } })?.data?.error ??
                "Login failed"}
            </p>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="py-2.5 px-4 bg-accent hover:bg-accent-hover text-white font-semibold rounded-md disabled:opacity-50"
          >
            {isLoading ? "Signing in…" : "Sign in"}
          </button>
        </Form>
      </Formik>
    </div>
  );
}
