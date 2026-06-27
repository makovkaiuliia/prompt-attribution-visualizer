import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Content-Security-Policy, injected as a <meta> tag at BUILD time only.
// Build-only because the dev server needs inline scripts + ws: for HMR, which a strict
// CSP would block. In production the only allowed network egress is the OpenAI API.
const CSP = [
  "default-src 'self'",
  "connect-src 'self' https://api.openai.com",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'", // Tailwind/React may emit inline style attributes
  "script-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ')

function cspPlugin() {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('</title>', `</title>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`)
    },
  }
}

export default defineConfig({
  plugins: [react(), cspPlugin()],
})
