// Edit these values to configure the site.
// Everything else (copy, projects, experience) lives in index.html.
window.SITE_CONFIG = {
  // Your Cloudflare Worker endpoint for the chatbot.
  // Leave empty ("") to disable the chatbot until the worker is deployed.
  // See worker/README.md for deployment instructions.
  chatWorkerUrl: "",

  // Your Formspree form endpoint. Sign up at https://formspree.io,
  // create a form, copy the endpoint (looks like https://formspree.io/f/abcdwxyz).
  // Leave empty ("") to fall back to a mailto: link for the contact form.
  formspreeUrl: "",

  // Fallback mailto used if formspreeUrl is empty.
  contactEmail: "lchenbusiness@gmail.com",

  // Social profiles — set the URLs and they'll be wired up automatically.
  social: {
    linkedin: "", // e.g. "https://www.linkedin.com/in/your-handle"
    github: "",   // e.g. "https://github.com/your-handle"
    medium: "",   // e.g. "https://medium.com/@your-handle"
  },
};
