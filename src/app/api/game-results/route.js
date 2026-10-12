import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import GameResult from '../../../models/GameResult';

export async function GET() {
  try {
    await dbConnect();
    const results = await GameResult.find({}).sort({ createdAt: -1 }).limit(20);
    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const result = await GameResult.create(body);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
