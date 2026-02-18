import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const bodySchema = z.object({
  student_email: z.string().email(),
  body: z.string().min(1)
});

export async function GET(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error;

  const { searchParams } = new URL(req.url);
  const studentEmail = searchParams.get("student_email") ?? "";

  return runPortalAction({
    action: "portal.admin.getStudentNotes",
    actor,
    data: { student_email: studentEmail }
  });
}

export async function POST(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.admin.addStudentNote",
    actor,
    data: parsed.data
  });
}
