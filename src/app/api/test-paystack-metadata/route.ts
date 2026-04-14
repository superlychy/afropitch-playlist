import { NextResponse } from "next/server";

// This endpoint just echoes back what it receives for debugging
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const headers = Object.fromEntries(req.headers.entries());
    
    console.log("=== TEST ENDPOINT RECEIVED ===");
    console.log("Headers:", JSON.stringify(headers, null, 2));
    console.log("Body:", JSON.stringify(body, null, 2));
    
    // Try to extract metadata structure
    if (body.data) {
      console.log("data.metadata:", JSON.stringify(body.data.metadata, null, 2));
      
      if (body.data.metadata?.custom_fields) {
        console.log("custom_fields array:");
        body.data.metadata.custom_fields.forEach((field: any, i: number) => {
          console.log(`  [${i}]:`, JSON.stringify(field, null, 2));
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Test endpoint received data",
      received: {
        event: body.event,
        hasMetadata: !!body.data?.metadata,
        customFieldsCount: body.data?.metadata?.custom_fields?.length || 0
      }
    });
  } catch (err: any) {
    console.error("Test endpoint error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Test endpoint ready",
    instructions: "POST to this endpoint with Paystack webhook data to inspect structure"
  });
}
