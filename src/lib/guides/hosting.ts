/**
 * The hosting guide's content, in one place.
 *
 * Orion exports a plain folder of HTML, CSS, JS and images — no build step and
 * no server — which is exactly what every static host on earth accepts. Rather
 * than run deployments ourselves, we teach the handful of hosts that are
 * genuinely free forever and get out of the way. Nothing here is affiliated
 * with Orion and none of it needs an Orion account.
 *
 * Shared by the guide page and the editor's Publish dialog so the two can
 * never drift apart.
 */

export type HostGuide = {
  slug: string;
  name: string;
  /** One line on why you would pick this one. */
  pitch: string;
  /** Realistic first-time completion time. */
  minutes: string;
  /** What the free URL looks like. */
  freeUrl: string;
  needsAccount: boolean;
  needsGit: boolean;
  customDomain: string;
  steps: string[];
  watchOut?: string;
  url: string;
};

/** Ordered easiest-first. The first entry is what the Publish dialog leads with. */
export const FREE_HOSTS: HostGuide[] = [
  {
    slug: "netlify-drop",
    name: "Netlify Drop",
    pitch: "Drag the folder onto a web page and it is live. No account, no terminal, no git.",
    minutes: "about 1 minute",
    freeUrl: "your-site.netlify.app",
    needsAccount: false,
    needsGit: false,
    customDomain: "Free — add your own domain in Site settings once you claim the site.",
    url: "https://app.netlify.com/drop",
    steps: [
      "Unzip the file Orion gave you. You should see index.html sitting at the top level.",
      "Open app.netlify.com/drop in a new tab.",
      "Drag the unzipped folder — the folder itself, not the files inside it — onto the drop area.",
      "Wait a few seconds. Netlify gives you a live URL like random-name-123.netlify.app.",
      "Click “Claim your site” and sign up free if you want to keep it, rename it, or add a domain. Unclaimed sites are deleted after an hour.",
    ],
    watchOut:
      "Drag the folder, not the .zip. If you drop the zip, Netlify publishes a page that offers your zip as a download instead of showing your site.",
  },
  {
    slug: "cloudflare-pages",
    name: "Cloudflare Pages",
    pitch: "The most generous free tier of the lot: unlimited bandwidth and a fast global network.",
    minutes: "about 5 minutes",
    freeUrl: "your-site.pages.dev",
    needsAccount: true,
    needsGit: false,
    customDomain: "Free, with free SSL. Cheapest place to buy the domain too — sold at cost.",
    url: "https://dash.cloudflare.com",
    steps: [
      "Create a free Cloudflare account and open the dashboard.",
      "Go to Workers & Pages, then Create, then the Pages tab, then “Upload assets”.",
      "Name the project — this becomes your-name.pages.dev — and continue.",
      "Drag in your unzipped folder, or use “select from computer”, then click Deploy site.",
      "Your site is live on the pages.dev URL. To update it later, open the project, choose Create new deployment, and upload the new folder.",
    ],
    watchOut:
      "Uploads are limited to 20,000 files and 25 MB per file. An Orion export is nowhere near either limit.",
  },
  {
    slug: "github-pages",
    name: "GitHub Pages",
    pitch: "Free forever, and your site's history is version-controlled. Worth it if you already use git.",
    minutes: "about 10 minutes",
    freeUrl: "yourname.github.io/your-repo",
    needsAccount: true,
    needsGit: true,
    customDomain: "Free, with free SSL. Set it under Settings → Pages → Custom domain.",
    url: "https://github.com/new",
    steps: [
      "Create a free GitHub account, then create a new public repository.",
      "On the empty repository page, click “uploading an existing file”.",
      "Drag in the contents of your unzipped folder — the files themselves, so index.html lands at the root of the repository — and commit.",
      "Open Settings → Pages. Under “Build and deployment”, set Source to “Deploy from a branch”, pick main and the / (root) folder, and save.",
      "Wait a minute or two, then reload the Settings → Pages screen for your live URL.",
    ],
    watchOut:
      "If index.html ends up inside a subfolder, the site will 404. It has to be at the repository root.",
  },
  {
    slug: "vercel",
    name: "Vercel",
    pitch: "Excellent free tier and instant rollbacks. Easiest through the command line.",
    minutes: "about 10 minutes",
    freeUrl: "your-site.vercel.app",
    needsAccount: true,
    needsGit: false,
    customDomain: "Free on the Hobby plan for personal, non-commercial sites.",
    url: "https://vercel.com/new",
    steps: [
      "Create a free Vercel account.",
      "Install the CLI: run npm i -g vercel in a terminal. (You need Node.js installed.)",
      "Open a terminal inside your unzipped folder and run vercel.",
      "Accept the defaults. When it asks for the project settings, leave the build command and output directory empty — there is nothing to build.",
      "Run vercel --prod to promote it to your live URL.",
    ],
    watchOut:
      "Vercel's Hobby plan is for non-commercial use. If the site is for a business, use Cloudflare Pages or Netlify instead.",
  },
];

export type PaidRoute = {
  slug: string;
  name: string;
  cost: string;
  pitch: string;
  points: string[];
};

/** What you actually pay for once free hosting is not enough. */
export const PAID_ROUTES: PaidRoute[] = [
  {
    slug: "custom-domain",
    name: "Your own domain name",
    cost: "$5 – $15 a year",
    pitch:
      "The single upgrade worth making. Hosting stays free — you are only paying for the name.",
    points: [
      "Buy from Cloudflare Registrar (sold at wholesale cost, no markup), Porkbun or Namecheap. Avoid the $1 first-year offers that renew at $40.",
      ".com is the safe choice. Cheaper endings like .xyz and .site work identically but read as less trustworthy to some visitors.",
      "Once bought, add it in your host's dashboard — Netlify: Domain management. Cloudflare Pages: Custom domains. GitHub: Settings → Pages.",
      "Your host then tells you which DNS records to create at the registrar. SSL is issued automatically and free on all four hosts above.",
      "DNS changes take anywhere from a few minutes to a few hours to take effect worldwide.",
    ],
  },
  {
    slug: "managed-hosting",
    name: "Paid managed hosting",
    cost: "$15 – $25 a month",
    pitch:
      "Netlify Pro, Vercel Pro or Cloudflare Pages Pro. Only worth it once you outgrow the free tier.",
    points: [
      "Buys you: password-protected sites, more build minutes, team members, analytics and a support queue.",
      "Does not buy you: a faster site. The free tiers use the same global network.",
      "Skip this until something on the free plan actually stops you. For a brochure site, that day may never come.",
    ],
  },
  {
    slug: "shared-hosting",
    name: "Traditional shared hosting",
    cost: "$3 – $10 a month",
    pitch:
      "Hostinger, Namecheap, SiteGround and the like. Choose this if you also need email at your domain.",
    points: [
      "You upload with a file manager or FTP client (FileZilla) into the public_html folder.",
      "Upload the contents of your folder, not the folder itself, so index.html sits directly in public_html.",
      "Usually includes mailboxes at your domain — the main thing the static hosts above do not offer.",
      "Introductory pricing typically triples on renewal. Check the renewal rate before you commit.",
    ],
  },
];

/** Things that go wrong regardless of which host you pick. */
export const TROUBLESHOOTING: { symptom: string; fix: string }[] = [
  {
    symptom: "The page is blank, or shows a file listing instead of my site.",
    fix: "index.html is not at the top level of what you uploaded. Go up or down one folder and upload again so index.html is at the root.",
  },
  {
    symptom: "My site loads but has no styling.",
    fix: "The style.css file was not uploaded, or the folder structure changed. Upload the whole folder exactly as it was exported — the paths inside the HTML are relative.",
  },
  {
    symptom: "Images are missing.",
    fix: "The assets folder did not make it. Check that assets/ came along with index.html, including everything inside it.",
  },
  {
    symptom: "My changes are not showing.",
    fix: "Your browser cached the old version. Hard-reload with Ctrl+Shift+R (Cmd+Shift+R on a Mac), or open the site in a private window.",
  },
  {
    symptom: "The browser warns the site is not secure.",
    fix: "The SSL certificate is still being issued — it takes a few minutes after adding a custom domain. If it persists past an hour, re-check the DNS records at your registrar.",
  },
];
