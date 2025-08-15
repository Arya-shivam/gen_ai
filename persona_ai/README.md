# ChaiGPT – Persona AI Chat App

ChaiGPT is a modern, full-stack AI chat application built with Next.js, TypeScript, and Tailwind CSS. It features multiple AI personas (like Hitesh Choudhary and Piyush Garg) and a unique Brainstorm Mode for collaborative conversations. The app supports both OpenAI and Gemini models, beautiful gradients, and dark mode.

---

## Features

- ✨ Multiple AI personas with unique avatars and expertise
- 🤝 Brainstorm Mode: Chat with multiple personas at once
- 🌗 Light & dark mode with animated gradients
- ⚡ Fast, responsive UI with Tailwind CSS
- 🔒 Environment-based API key management
- 🧠 Supports OpenAI and Gemini (Google) LLMs

---

## Getting Started

### 1. Clone the repository

```sh
git clone https://github.com/yourusername/chaigpt.git
cd chaigpt
```

### 2. Install dependencies

```sh
npm install
# or
yarn install
```

### 3. Set up environment variables

Create a `.env.local` file in the project root:

```
OPENAI_API_KEY=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
```

> **Note:** Never commit your API keys to version control.

### 4. Run the development server

```sh
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## Project Structure

```
/public                # Static assets (avatars, images)
/src
  /app                 # Next.js app directory
  /components          # Reusable UI and chat components
  /lib                 # Utility functions
  /types               # TypeScript types
  /api                 # API routes (chat, etc.)
tailwind.config.js     # Tailwind CSS config
tsconfig.json          # TypeScript config
.env.local             # Environment variables (not committed)
```

---

## Deployment

Check the Project : https://chaicodegpt.vercel.app/

---

## Customization

- **Add new personas:** Edit the `personas` array in `/src/app/page.tsx`.
- **Change avatars:** Place new images in `/public` and update the avatar path.
- **Styling:** Tweak Tailwind classes or extend the theme in `tailwind.config.js`.

---

## License

MIT

---

## Credits

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [OpenAI](https://openai.com/)
- [Google Gemini](https://ai.google.dev
