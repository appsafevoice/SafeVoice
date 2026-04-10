export async function waitForNextPaint() {
  if (typeof window === "undefined") return

  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve())
    })
  })
}

interface PrintLoadingHtmlOptions {
  title: string
  description: string
}

export function buildPrintLoadingHtml({ title, description }: PrintLoadingHtmlOptions) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      :root {
        color-scheme: light;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        font-family: Arial, sans-serif;
        background: linear-gradient(180deg, #fff8f8 0%, #ffffff 100%);
        color: #531313;
      }

      .card {
        width: min(440px, 100%);
        border-radius: 24px;
        border: 1px solid #e7cfcf;
        background: rgba(255, 255, 255, 0.96);
        box-shadow: 0 24px 80px rgba(83, 19, 19, 0.12);
        padding: 28px;
      }

      .header {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .spinner {
        width: 48px;
        height: 48px;
        border-radius: 999px;
        border: 4px solid rgba(0, 124, 206, 0.14);
        border-top-color: #007cce;
        animation: spin 0.8s linear infinite;
      }

      h1 {
        margin: 0;
        font-size: 22px;
      }

      p {
        margin: 6px 0 0;
        color: #8f6060;
        line-height: 1.6;
      }

      .bar {
        margin-top: 24px;
        height: 10px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(129, 0, 0, 0.12);
      }

      .bar::before {
        content: "";
        display: block;
        height: 100%;
        width: 38%;
        border-radius: inherit;
        background: linear-gradient(90deg, #007cce 0%, #4da6d9 100%);
        animation: slide 1.2s ease-in-out infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes slide {
        0%,
        100% {
          transform: translateX(-20%);
        }

        50% {
          transform: translateX(160%);
        }
      }
    </style>
  </head>
  <body>
    <main class="card">
      <div class="header">
        <div class="spinner" aria-hidden="true"></div>
        <div>
          <h1>${title}</h1>
          <p>${description}</p>
        </div>
      </div>
      <div class="bar" aria-hidden="true"></div>
    </main>
  </body>
</html>`
}
