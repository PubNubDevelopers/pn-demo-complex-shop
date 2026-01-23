Here is a precision-engineered prompt designed to get the best possible result from Claude Sonnet 4.5. It breaks the request down into a **Developer Role**, **Visual Design Spec**, **Configuration Context**, and a strict **Deployment Protocol**.

You can copy and paste this entire block directly into Claude.

---

### The Prompt for Claude

```markdown
**Role:** Senior Frontend Engineer & DevOps Specialist
**Context:** I need you to rebrand and deploy an existing React application ("PubNub Live Shopping Solution") to Netlify.

**Source Code:**
Use the code from this repository exactly as is, without changing the core functionality:
`https://github.com/PubNubDevelopers/pn-solution-live-shopping`

---

### Phase 1: Rebranding & Design System
Update the application's visual identity to match the "Complex" brand (High-contrast, streetwear/culture aesthetic).

**1. Color Palette Implementation**
Replace the existing color scheme with the following values. Ensure these are mapped semantically (e.g., `complex.red` for primary actions/accents, `complex.black` for backgrounds).

```json
{
    "colors": {
        "complex": {
            "red": "#FF0000",
            "black": "#000000",
            "white": "#FFFFFF",
            "gray": {
                "dark": "#333333",
                "DEFAULT": "#666666",
                "light": "#F2F2F2"
            }
        }
    }
}

```

**2. Logo Replacement**

* Target the main navigation/header logo component.
* Replace the existing asset with: `images/logo-trans-bg.jpeg`
* Ensure the new logo is sized correctly within the navbar.

---

### Phase 2: Configuration

Configure the application to use my specific PubNub credentials.

**1. Update PubNub Keys**
Locate the configuration file (likely `.env`, `pubnub-keys.json`, or a constant file) and hardcode/set the following keys:

* **Publish Key:** `pub-c-ba81a7e5-6e88-49f0-b2a7-46b9f7a8dd00`
* **Subscribe Key:** `sub-c-738373be-83dd-4519-bca5-f0a8a7cd354e`

**2. Admin API Context (For your reference)**
If you need to generate any additional configuration scripts that require admin access, use this API Key (Note: This is an API key, not a secret key):
`si_lgfzsp49j1mw.sbtoBnE9JWqcpTsKtzxwvMhvtdVl+mWOUI6J2YlQZaK8`

---

### Phase 3: Netlify Deployment Protocol

**Important:** Do not execute the final deploy command immediately. Follow these steps sequentially:

1. **Preparation:** Provide the CLI commands to install dependencies, build the project, and install the Netlify CLI if not present.
2. **Authentication:** Provide the command to login to Netlify. **Crucial:** Instruct me to log in specifically to the **`pubnub-web`** team.
3. **Site Link:** Provide the command to link this folder to a new Netlify site with the specific project name: **`pn-demo-complex-shop`**.
4. **Environment Variables:** Provide the `netlify env:set` commands to upload the PubNub keys (defined in Phase 2) to the Netlify project.
5. **Confirmation Pause:** **STOP HERE.** Ask me for confirmation to proceed.
6. **Deployment:** Only after I explicitly type "CONFIRMED", provide the final `netlify deploy --prod` command.

**Deliverables:**

1. The specific code blocks for the CSS/Tailwind config changes.
2. The specific code blocks for the Logo component update.
3. The specific code blocks for the Configuration update.
4. The Step-by-Step CLI command script for the Netlify deployment.
