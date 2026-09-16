# SathishKumar Portfolio

A responsive cybersecurity + software-development portfolio with a cyber-terminal visual style.

## Improvements in this version
- Refined dark/light visual system and glass surfaces
- Better SEO/social metadata
- Accessible skip link, navigation labels and reduced-motion support
- Persistent theme preference
- Active section navigation
- Project category filters
- Scroll progress + back-to-top control
- Safer external-link behavior
- Mobile-friendly interaction improvements
- Contact form connected to the Express `/api/contact` endpoint
- Basic contact endpoint rate limiting and payload validation
- `index.html` entry point for simple hosting
- `.env.example` and `.gitignore` included

## Run locally

1. Install Node.js 18+.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and add your mail/Twilio settings.
4. Run `npm start`.
5. Open `http://localhost:3000`.

The portfolio also works as a static page, but the contact form requires the Express backend.
