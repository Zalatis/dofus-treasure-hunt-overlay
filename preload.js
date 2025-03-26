const { ipcRenderer } = require("electron");

window.addEventListener("DOMContentLoaded", async () => {
  // CSS to hide the header
  document.head.appendChild(Object.assign(document.createElement("link"), { rel: "stylesheet", href: "https://zalati.fr/download/DofusDB-Treasure-Hunt.css" }));
  const customCssPath = await ipcRenderer.invoke("get-custom-css-path");
  const customCssExists = await ipcRenderer.invoke("custom-css-exists");
  const customCSS = `
        header {
            display: none;
        }
        .q-page-container {
            z-index: 1;
            background: #474747;
        }
        footer {
            display: none!important;
        }
        .q-pa-md {
            padding: 4px 4px!important;
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        .pip-button {
            display: none!important;
        }
        /* Firefox */
        input[type="number"] {
            -moz-appearance: textfield;
        }
        .q-card.q-card--dark {
            padding-left: 4px;
            padding-right: 4px;
        }
        .q-bar--standard {
            height: fit-content; 
        }
        .text-negative > div > i {
            display: none;
        }
        .grecaptcha-badge {
            z-index: -1!important;
        }
    `;

  // Create a style element and append it to the document
  const style = document.createElement("style");
  style.textContent = customCSS;
  document.head.appendChild(style);

  if (customCssExists) {
    // Load the local custom.css
    document.head.appendChild(Object.assign(document.createElement("link"), {
        rel: "stylesheet",
        href: `file://${customCssPath}`
    }));
    console.log("Loaded local custom.css:", customCssPath);
  } else {
      // Load the remote CSS as a fallback
      document.head.appendChild(Object.assign(document.createElement("link"), {
          rel: "stylesheet",
          href: remoteCssUrl
      }));
      console.log("Loaded remote CSS:", remoteCssUrl);
  }
  console.log("Custom CSS injected");
});
