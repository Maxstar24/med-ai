This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Med-AI

A medical education platform with AI-powered quiz generation.

### Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up your Google Gemini API key:
   - Get an API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Make sure your API key has access to the Gemini 1.5 Pro model
   - Run the setup script:
     ```
     node setup-api-key.js
     ```
   - Or manually create a `.env.local` file with:
     ```
     GOOGLE_AI_API_KEY=your_api_key_here
     ```

4. Start the development server:
   ```
   npm run dev
   ```

### Features

- Create and manage medical quizzes
- Multiple question types: multiple-choice, true/false, short answer, and spot questions
- AI-powered question generation using Google Gemini 1.5 Pro
- User authentication with Firebase
- Responsive design for all devices

### Technologies

- Next.js
- React
- TypeScript
- MongoDB
- Firebase Authentication
- Google Gemini 1.5 Pro AI
- Tailwind CSS
