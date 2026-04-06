import { NextRequest, NextResponse } from "next/server";

const ENTITY_API_ORIGIN = process.env.ENTITY_API_ORIGIN || "http://127.0.0.1:8081";

export async function GET(req: NextRequest, { params }: { params: Promise<{ entityId: string }> }) {
  try {
    const { entityId } = await params;
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // First, get all employees from the entity
    const listUrl = `${ENTITY_API_ORIGIN}/v1/entities/${encodeURIComponent(entityId)}/employees`;
    
    const listRes = await fetch(listUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!listRes.ok) {
      const text = await listRes.text();
      return NextResponse.json({ error: "Failed to list employees", details: text }, { status: listRes.status });
    }

    const employees = await listRes.json();
    
    // Find employee by email
    const employee = Array.isArray(employees) 
      ? employees.find((emp: any) => emp.email?.toLowerCase() === email.toLowerCase())
      : null;

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Return employee data with roles
    return NextResponse.json({
      employeeId: employee.employeeId || employee.employee_id || employee.id,
      email: employee.email,
      name: employee.name || employee.displayName,
      roles: employee.roles || [],
      status: employee.status,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to get employee by email" }, { status: 500 });
  }
}
