import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth/app-user";
import { localDateString } from "@/lib/dates";
import { getDashboardSnapshot } from "@/lib/data";
import { dateSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? localDateString();
  const authentication = await authenticateApiRequest();
  if (!authentication.authenticated) return authentication.response;

  const parsedDate = dateSchema.safeParse(date);
  if (!parsedDate.success) {
    return NextResponse.json({ error: "Date must use YYYY-MM-DD format." }, { status: 400 });
  }
  const requestedRange = request.nextUrl.searchParams.get("range") ?? "7";
  if (requestedRange !== "7" && requestedRange !== "30" && requestedRange !== "90") {
    return NextResponse.json({ error: "Range must be 7, 30, or 90 days." }, { status: 400 });
  }
  try {
    const range = requestedRange === "90" ? 90 : requestedRange === "30" ? 30 : 7;
    return NextResponse.json(await getDashboardSnapshot(authentication.user, date, range));
  } catch (error) {
    console.error("Unable to load the journal dashboard.", error);
    return NextResponse.json(
      { error: "Unable to connect to the journal database. Check DATABASE_URL and run the database migrations." },
      { status: 503 },
    );
  }
}
