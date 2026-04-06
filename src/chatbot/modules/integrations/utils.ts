import { type IntegrationId, WIDGET_URL } from "./constants";

export const createScript = (
  integrationId: IntegrationId,
  entityId: string,
  chatbotId: string,
) => {
  switch (integrationId) {
    case "html":
      return `<!-- Add this before closing </body> tag -->
<script
  src="${WIDGET_URL}/widget.js"
  data-entity-id="${entityId}"
  data-chatbot-id="${chatbotId}"
></script>`;

    case "react":
      return `// Add to your component or _app.tsx
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '${WIDGET_URL}';
    script.dataset.entityId = '${entityId}';
    script.dataset.chatbotId = '${chatbotId}';
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return <div>Your App</div>;
}`;

    case "nextjs":
      return `// Add to app/layout.tsx or pages/_app.tsx
import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Script
          src="${WIDGET_URL}"
          strategy="lazyOnload"
          data-entity-id="${entityId}"
          data-chatbot-id="${chatbotId}"
        />
      </body>
    </html>
  );
}`;

    case "javascript":
      return `// Add this to your JavaScript file
(function() {
  const script = document.createElement('script');
  script.src = '${WIDGET_URL}';
  script.dataset.entityId = '${entityId}';
  script.dataset.chatbotId = '${chatbotId}';
  document.body.appendChild(script);
})();`;

    case "wordpress":
      return `<!-- Add this to your WordPress theme's footer.php before </body> tag -->
<!-- Or use "Insert Headers and Footers" plugin -->
<script
  src="${WIDGET_URL}"
  data-entity-id="${entityId}"
  data-chatbot-id="${chatbotId}"
></script>`;

    case "shopify":
      return `<!-- Shopify: Go to Online Store > Themes > Actions > Edit Code -->
<!-- Open theme.liquid and add before </body> tag -->
<script
  src="${WIDGET_URL}"
  data-entity-id="${entityId}"
  data-chatbot-id="${chatbotId}"
></script>`;

    case "webflow":
      return `<!-- Webflow: Go to Project Settings > Custom Code > Footer Code -->
<script
  src="${WIDGET_URL}"
  data-entity-id="${entityId}"
  data-chatbot-id="${chatbotId}"
></script>`;

    case "wix":
      return `<!-- Wix: Go to Settings > Custom Code > + Add Custom Code -->
<!-- Choose "Body - end" as the placement -->
<script
  src="${WIDGET_URL}"
  data-entity-id="${entityId}"
  data-chatbot-id="${chatbotId}"
></script>`;

    default:
      return "";
  }
}