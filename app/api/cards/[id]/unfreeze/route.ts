import { NextRequest } from "next/server";
import { updateOwnedCardStatus } from "@/lib/card-actions";
export async function POST(request: NextRequest, { params }: { params: { id: string } }) { return updateOwnedCardStatus(request, params.id, "frozen", "active"); }
