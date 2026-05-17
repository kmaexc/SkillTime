import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  try {
    const { skillName } = await request.json();

    if (!skillName) {
      return NextResponse.json({ error: "skillName is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "서버에 Gemini API 키가 설정되어 있지 않습니다." }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // 가장 빠르고 가벼운 최신 플래시 모델 사용
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
Analyze the user's inputted skill name: "${skillName}".
It can be any skill (computer programming, cooking, art, language, soft skills, etc).
Determine if it is a valid, recognizable skill.
If valid, return the universally accepted standard name, preferably in English or the most common global term (e.g., '파이썬' -> 'Python', '프랑스어' -> 'French', '한식조리' -> 'Korean Cuisine', '피아노' -> 'Piano').
If invalid or nonsense (e.g., '아무말대잔치', '123123', 'asdf'), return 'INVALID'.

Output ONLY a JSON object with this exact format without markdown backticks:
{
  "isValid": boolean,
  "standardizedName": "Standardized Name",
  "category": "Category Name"
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    // Clean markdown formatting if Gemini returns it
    const cleanText = text.replace(/```json/gi, "").replace(/```/g, "").trim();

    try {
      const parsed = JSON.parse(cleanText);
      return NextResponse.json(parsed);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", text);
      return NextResponse.json({ isValid: false, standardizedName: "", category: "" });
    }
    
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json({ error: "AI 분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}
