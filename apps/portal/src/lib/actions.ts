"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ConflictError, ForbiddenError, NotFoundError, isModuleId } from "@automsp/core";
import { SESSION_COOKIE, getStore, requireScope } from "./session";

function back(path: string, error?: unknown): never {
  if (error instanceof ForbiddenError || error instanceof ConflictError || error instanceof NotFoundError) {
    redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }
  if (error) throw error;
  redirect(path);
}

export async function signIn(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  try {
    getStore().scope(userId);
  } catch {
    redirect("/login");
  }
  (await cookies()).set(SESSION_COOKIE, userId, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/dashboard");
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

export async function decideApproval(formData: FormData) {
  const scope = await requireScope();
  const id = String(formData.get("id") ?? "");
  const decision = formData.get("decision") === "approved" ? "approved" : "rejected";
  const note = String(formData.get("note") ?? "").trim() || undefined;
  try {
    scope.decide(id, decision, note);
  } catch (e) {
    back("/approvals", e);
  }
  revalidatePath("/", "layout");
  back("/approvals");
}

export async function toggleModule(formData: FormData) {
  const scope = await requireScope();
  const id = String(formData.get("id") ?? "");
  if (!isModuleId(id)) back("/modules", new NotFoundError("Module"));
  try {
    scope.setModule(id, formData.get("enable") === "1");
  } catch (e) {
    back("/modules", e);
  }
  revalidatePath("/", "layout");
  back("/modules");
}
