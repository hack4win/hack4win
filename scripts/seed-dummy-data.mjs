import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const sql = neon(databaseUrl);

// 30 Diverse, realistic developer participants
const DUMMY_USERS = [
  {
    id: "usr_aarav_sharma",
    name: "Aarav Sharma",
    email: "aarav.sharma@build.dev",
    email_verified: true,
    role: "user",
    country: "India",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80",
    bio: "Full-stack engineer & AI researcher building autonomous agents and real-time distributed systems.",
    github_username: "aarav-sharma-dev",
    website: "https://aarav.dev",
    skills: ["Next.js", "TypeScript", "Python", "FastAPI", "Docker", "PostgreSQL"],
  },
  {
    id: "usr_priya_patel",
    name: "Priya Patel",
    email: "priya.patel@codehub.io",
    email_verified: true,
    role: "user",
    country: "India",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200&auto=format&fit=crop&q=80",
    bio: "Product engineer & frontend enthusiast. Obsessed with micro-interactions, accessibility, and high FPS animations.",
    github_username: "priyapatel-ui",
    website: "https://priyapatel.design",
    skills: ["React", "Next.js", "TailwindCSS", "Framer Motion", "TypeScript"],
  },
  {
    id: "usr_rohan_gupta",
    name: "Rohan Gupta",
    email: "rohan.gupta@neuralstack.ai",
    email_verified: true,
    role: "user",
    country: "India",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=1200&auto=format&fit=crop&q=80",
    bio: "Machine learning engineer specializing in LLM fine-tuning, retrieval-augmented generation (RAG), and vector databases.",
    github_username: "rohangupta-ml",
    website: "https://rohanml.tech",
    skills: ["Python", "PyTorch", "LangChain", "OpenAI", "FastAPI", "Pinecone"],
  },
  {
    id: "usr_ananya_desai",
    name: "Ananya Desai",
    email: "ananya.desai@cloudmesh.in",
    email_verified: true,
    role: "user",
    country: "India",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80",
    bio: "Cloud Architect & DevOps advocate. Scaling Kubernetes clusters, serverless pipelines, and Terraform infrastructure.",
    github_username: "ananyadesai",
    website: "https://ananya.cloud",
    skills: ["AWS", "Docker", "Kubernetes", "Terraform", "Go", "PostgreSQL"],
  },
  {
    id: "usr_vikram_reddy",
    name: "Vikram Reddy",
    email: "vikram.reddy@rustforge.org",
    email_verified: true,
    role: "user",
    country: "India",
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80",
    bio: "Systems hacker & Rust fan. Writing low-latency networking engines, WebAssembly runtimes, and embedded firmware.",
    github_username: "vikramreddy-rs",
    website: "https://vikramreddy.io",
    skills: ["Rust", "WebAssembly", "C++", "Linux", "Distributed Systems"],
  },
  {
    id: "usr_sophia_chen",
    name: "Sophia Chen",
    email: "sophia.chen@stanford.alumni.edu",
    email_verified: true,
    role: "user",
    country: "United States",
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1200&auto=format&fit=crop&q=80",
    bio: "AI researcher & entrepreneur. Building multi-modal reasoning models and collaborative agent swarms.",
    github_username: "sophiachen-ai",
    website: "https://sophiachen.ai",
    skills: ["Python", "PyTorch", "Transformers", "Next.js", "TypeScript"],
  },
  {
    id: "usr_alex_rivera",
    name: "Alex Rivera",
    email: "alex.rivera@devfrontier.com",
    email_verified: true,
    role: "user",
    country: "United States",
    image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80",
    bio: "Full-stack builder & open source creator. Passionate about real-time collaborative web applications.",
    github_username: "alexrivera-code",
    website: "https://alexrivera.dev",
    skills: ["Next.js", "React", "GraphQL", "Node.js", "Prisma", "PostgreSQL"],
  },
  {
    id: "usr_marcus_johnson",
    name: "Marcus Johnson",
    email: "marcus.j@cyberfortress.net",
    email_verified: true,
    role: "user",
    country: "United States",
    image: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80",
    bio: "Cybersecurity engineer & ethical hacker. Specializing in smart contract security, zero-knowledge proofs, and web audit.",
    github_username: "marcusj-sec",
    website: "https://marcusjohnson.sec",
    skills: ["Solidity", "Rust", "Go", "Python", "Cryptography"],
  },
  {
    id: "usr_emily_watson",
    name: "Emily Watson",
    email: "emily.watson@oxford.alumni.uk",
    email_verified: true,
    role: "user",
    country: "United Kingdom",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop&q=80",
    bio: "Computational bioinformatician bridging genomics and deep learning. Active hackathon winner in Cambridge & London.",
    github_username: "emilywatson-bio",
    website: "https://emilywatson.science",
    skills: ["Python", "R", "PyTorch", "Docker", "Next.js"],
  },
  {
    id: "usr_oliver_davies",
    name: "Oliver Davies",
    email: "oliver.davies@finflow.co.uk",
    email_verified: true,
    role: "user",
    country: "United Kingdom",
    image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1200&auto=format&fit=crop&q=80",
    bio: "FinTech software engineer building algorithmic order matching engines and decentralized settlement rails.",
    github_username: "oliverdavies-uk",
    website: "https://oliverdavies.finance",
    skills: ["Go", "TypeScript", "PostgreSQL", "Kafka", "Docker"],
  },
  {
    id: "usr_lucas_schmidt",
    name: "Lucas Schmidt",
    email: "lucas.schmidt@berlincode.de",
    email_verified: true,
    role: "user",
    country: "Germany",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80",
    bio: "Senior backend developer in Berlin. Focused on high-throughput microservices, vector search, and edge computing.",
    github_username: "lucasschmidt-de",
    website: "https://schmidt.berlin",
    skills: ["Go", "Rust", "PostgreSQL", "Redis", "gRPC"],
  },
  {
    id: "usr_hannah_weber",
    name: "Hannah Weber",
    email: "hannah.weber@tum.alumni.de",
    email_verified: true,
    role: "user",
    country: "Germany",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200&auto=format&fit=crop&q=80",
    bio: "Autonomous robotics engineer & computer vision enthusiast. Crafting SLAM algorithms and edge perception networks.",
    github_username: "hannahweber-cv",
    website: "https://hannahweber.tech",
    skills: ["C++", "Python", "ROS2", "OpenCV", "PyTorch"],
  },
  {
    id: "usr_yuki_tanaka",
    name: "Yuki Tanaka",
    email: "yuki.tanaka@tokyodev.jp",
    email_verified: true,
    role: "user",
    country: "Japan",
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&auto=format&fit=crop&q=80",
    bio: "Tokyo-based creative coder & WebGL enthusiast. Pushing spatial audio, Three.js shaders, and interactive digital art.",
    github_username: "yukitanaka-jp",
    website: "https://yukitanaka.art",
    skills: ["Three.js", "WebGL", "TypeScript", "Next.js", "GLSL"],
  },
  {
    id: "usr_kenji_sato",
    name: "Kenji Sato",
    email: "kenji.sato@kyototech.ac.jp",
    email_verified: true,
    role: "user",
    country: "Japan",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&auto=format&fit=crop&q=80",
    bio: "Database kernel enthusiast. Optimizing columnar vector storage, write-ahead logging, and SIMD queries.",
    github_username: "kenjisato-db",
    website: "https://kenjisato.dev",
    skills: ["Rust", "C++", "PostgreSQL", "DuckDB", "Linux"],
  },
  {
    id: "usr_chloe_martin",
    name: "Chloé Martin",
    email: "chloe.martin@stationf.paris",
    email_verified: true,
    role: "user",
    country: "France",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&auto=format&fit=crop&q=80",
    bio: "Parisian startup founder & full-stack architect. Passionate about green tech, ESG verification, and lean codebases.",
    github_username: "chloemartin-fr",
    website: "https://chloemartin.fr",
    skills: ["Next.js", "TailwindCSS", "Node.js", "Neon", "Stripe"],
  },
  {
    id: "usr_mateo_rossi",
    name: "Mateo Rossi",
    email: "mateo.rossi@polimi.it",
    email_verified: true,
    role: "user",
    country: "Italy",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=1200&auto=format&fit=crop&q=80",
    bio: "Mobile app developer & Swift evangelist. Building spatial computing experiences for Apple Vision Pro & iOS.",
    github_username: "mateorossi-swift",
    website: "https://mateorossi.it",
    skills: ["Swift", "SwiftUI", "visionOS", "Metal", "Kotlin"],
  },
  {
    id: "usr_liam_oconnor",
    name: "Liam O'Connor",
    email: "liam.oconnor@torontotech.ca",
    email_verified: true,
    role: "user",
    country: "Canada",
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=1200&auto=format&fit=crop&q=80",
    bio: "Distributed systems engineer based in Toronto. Scaling vector pipelines, Apache Arrow memory engines, and Redis caches.",
    github_username: "liamoconnor-ca",
    website: "https://liamoconnor.ca",
    skills: ["Python", "Rust", "Apache Arrow", "Kafka", "Docker"],
  },
  {
    id: "usr_jessica_miller",
    name: "Jessica Miller",
    email: "jessica.m@waterlooventures.ca",
    email_verified: true,
    role: "user",
    country: "Canada",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80",
    bio: "University of Waterloo alum & AI product builder. Crafting intuitive UX for developer infrastructure.",
    github_username: "jessicamiller-dev",
    website: "https://jessicamiller.tech",
    skills: ["Next.js", "TypeScript", "React", "TailwindCSS", "Figma"],
  },
  {
    id: "usr_wei_zhang",
    name: "Wei Zhang",
    email: "wei.zhang@nus.sg",
    email_verified: true,
    role: "user",
    country: "Singapore",
    image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1200&auto=format&fit=crop&q=80",
    bio: "Singapore-based Web3 architect & smart contract auditor. Building zero-knowledge rollups and decentralized oracles.",
    github_username: "weizhang-sg",
    website: "https://weizhang.sg",
    skills: ["Solidity", "Rust", "Foundry", "Zero Knowledge", "Go"],
  },
  {
    id: "usr_minjun_kim",
    name: "Min-jun Kim",
    email: "minjun.kim@seoulcode.kr",
    email_verified: true,
    role: "user",
    country: "South Korea",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=1200&auto=format&fit=crop&q=80",
    bio: "Deep learning engineer in Seoul. Generative audio synthesis, low-bit quantization, and ONNX model deployment.",
    github_username: "minjunkim-ai",
    website: "https://minjunkim.kr",
    skills: ["PyTorch", "Python", "ONNX", "FastAPI", "C++"],
  },
  {
    id: "usr_carlos_silva",
    name: "Carlos Silva",
    email: "carlos.silva@saopaulolabs.br",
    email_verified: true,
    role: "user",
    country: "Brazil",
    image: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=1200&auto=format&fit=crop&q=80",
    bio: "Fintech innovator & lead architect. Building instant payment rails (PIX) and high-throughput transaction brokers.",
    github_username: "carlossilva-br",
    website: "https://carlossilva.dev",
    skills: ["Java", "Kotlin", "Spring Boot", "Kafka", "PostgreSQL"],
  },
  {
    id: "usr_isabella_santos",
    name: "Isabella Santos",
    email: "isabella.santos@rio-tech.br",
    email_verified: true,
    role: "user",
    country: "Brazil",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop&q=80",
    bio: "Frontend engineer & community organizer. Loves open source, React server components, and modern CSS layout engines.",
    github_username: "isabellasantos-ui",
    website: "https://isabellasantos.design",
    skills: ["React", "Next.js", "CSS Grid", "TypeScript", "TailwindCSS"],
  },
  {
    id: "usr_elena_petrova",
    name: "Elena Petrova",
    email: "elena.petrova@amsterdamdev.nl",
    email_verified: true,
    role: "user",
    country: "Netherlands",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?w=1200&auto=format&fit=crop&q=80",
    bio: "Data engineer & ML ops lead in Amsterdam. Creating reproducible ML pipelines with Kubeflow and MLflow.",
    github_username: "elenapetrova-nl",
    website: "https://elenapetrova.io",
    skills: ["Python", "Kubeflow", "Spark", "PostgreSQL", "Docker"],
  },
  {
    id: "usr_noah_andersen",
    name: "Noah Andersen",
    email: "noah.andersen@kth.se",
    email_verified: true,
    role: "user",
    country: "Sweden",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=1200&auto=format&fit=crop&q=80",
    bio: "Nordic climate tech hacker. Building distributed sensor networks and smart grid balancing software.",
    github_username: "noahandersen-se",
    website: "https://noahandersen.tech",
    skills: ["Go", "MQTT", "TimescaleDB", "Rust", "Next.js"],
  },
  {
    id: "usr_maya_lin",
    name: "Maya Lin",
    email: "maya.lin@sydneycode.au",
    email_verified: true,
    role: "user",
    country: "Australia",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1200&auto=format&fit=crop&q=80",
    bio: "Full-stack developer from Sydney. Creating developer tools, CLI utilities, and AI documentation generators.",
    github_username: "mayalin-au",
    website: "https://mayalin.dev",
    skills: ["TypeScript", "Next.js", "Node.js", "TailwindCSS", "Neon"],
  },
  {
    id: "usr_jack_taylor",
    name: "Jack Taylor",
    email: "jack.taylor@melbournetech.au",
    email_verified: true,
    role: "user",
    country: "Australia",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200&auto=format&fit=crop&q=80",
    bio: "Game developer & WebGPU researcher. Building web-first physics engines and collaborative multiplayer simulations.",
    github_username: "jacktaylor-webgpu",
    website: "https://jacktaylor.games",
    skills: ["WebGPU", "Rust", "TypeScript", "WebSockets", "Three.js"],
  },
];

async function seed() {
  console.log("🚀 Starting database dummy data seeding...");

  // 1. Insert or update users
  console.log(`\n📦 Seeding ${DUMMY_USERS.length} participants...`);
  for (const user of DUMMY_USERS) {
    await sql`
      INSERT INTO public.users (
        id, name, email, email_verified, image, banner_url, role,
        bio, github_username, skills, website, country, created_at, updated_at
      ) VALUES (
        ${user.id},
        ${user.name},
        ${user.email},
        ${user.email_verified},
        ${user.image},
        ${user.banner_url},
        ${user.role},
        ${user.bio},
        ${user.github_username},
        ${user.skills}::text[],
        ${user.website},
        ${user.country},
        NOW() - (random() * interval '30 days'),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        image = EXCLUDED.image,
        banner_url = EXCLUDED.banner_url,
        bio = EXCLUDED.bio,
        skills = EXCLUDED.skills,
        website = EXCLUDED.website,
        country = EXCLUDED.country,
        updated_at = NOW();
    `;
  }
  console.log(`✅ Successfully seeded ${DUMMY_USERS.length} users.`);

  // 2. Fetch or create hackathons
  const existingHackathons = await sql`
    SELECT id, slug, title FROM public.hackathons;
  `;
  console.log(`\n📋 Found ${existingHackathons.length} existing hackathons.`);

  let globalAhackathon = existingHackathons.find((h) => h.slug === "global-ahackathon");
  let globalAiSprint = existingHackathons.find((h) => h.slug === "global-ai-agents-sprint-2026");

  // Create additional rich hackathons if not present
  let nextGenMobile = existingHackathons.find((h) => h.slug === "nextgen-mobile-spatial-challenge-2026");
  if (!nextGenMobile) {
    console.log("✨ Creating 'NextGen Mobile & Spatial Reality Challenge' hackathon...");
    const rows = await sql`
      INSERT INTO public.hackathons (
        title, slug, tagline, description,
        banner_url, thumbnail_url, status, format, location,
        prize_pool, currency, prizes, tags,
        start_date, end_date, submission_deadline, max_team_size,
        website_url, organizer_name, created_at, updated_at
      ) VALUES (
        'NextGen Mobile & Spatial Apps Challenge 2026',
        'nextgen-mobile-spatial-challenge-2026',
        'Build revolutionary mobile apps and spatial computing experiences for iOS, visionOS, and Android',
        '## Welcome to the NextGen Mobile & Spatial Reality Challenge!

Welcome builders, mobile developers, and spatial computing creators. This worldwide challenge invites teams to craft the next leap forward in everyday computing.

### 🎯 Challenge Tracks
1. **Spatial Computing & visionOS**: Revolutionary mixed-reality tools, workplace utilities, and 3D interactions.
2. **AI-Powered Mobile Apps**: Local on-device SLMs, camera intelligence, and real-time audio perception.
3. **Cross-Platform Excellence**: Butter-smooth Flutter, React Native, or Kotlin Multiplatform prototypes.

### 🏆 Prize Tiers & Rewards
- **1st Grand Prize**: ₹150,000 Cash + Apple Vision Pro or iPhone 16 Pro Max
- **2nd Place**: ₹75,000 Cash + Meta Quest 3 (512GB)
- **3rd Place**: ₹35,000 Cash + Custom Builder Trophy + Swag Box

Join developers from over 40 countries and showcase your vision to industry leaders.',
        'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&auto=format&fit=crop&q=80',
        'upcoming',
        'online',
        'Global (Online)',
        '₹260,000 + Devices & Perks',
        '₹',
        ${JSON.stringify([
          { id: "p1", title: "1st Grand Prize", amount: "150000", type: "cash", description: "Direct bank transfer to winning team" },
          { id: "p2", title: "Spatial Innovation Award", amount: "", type: "non-cash", item_name: "Apple Vision Pro / Meta Quest 3", description: "Brand new hardware delivered worldwide" },
          { id: "p3", title: "2nd Place", amount: "75000", type: "cash", description: "Runner up cash reward" },
          { id: "p4", title: "3rd Place", amount: "35000", type: "cash", description: "Bronze tier award" },
        ])}::jsonb,
        ARRAY['Mobile', 'iOS', 'AR/VR', 'Flutter', 'AI']::text[],
        NOW() + interval '5 days',
        NOW() + interval '25 days',
        NOW() + interval '24 days',
        4,
        'https://spatialchallenge.do4win.com',
        'Spatial Computing Alliance',
        NOW(),
        NOW()
      )
      RETURNING id, slug, title;
    `;
    nextGenMobile = rows[0];
  }

  // 3. Register participants across hackathons
  if (globalAhackathon) {
    console.log(`\n👥 Registering participants to '${globalAhackathon.title}'...`);
    // Register 22 participants
    const participantsToRegister = DUMMY_USERS.slice(0, 22);
    for (const u of participantsToRegister) {
      await sql`
        INSERT INTO public.hackathon_registrations (hackathon_id, user_id, created_at)
        VALUES (${globalAhackathon.id}::uuid, ${u.id}, NOW() - (random() * interval '10 days'))
        ON CONFLICT (hackathon_id, user_id) DO NOTHING;
      `;
    }
    console.log(`✅ Registered ${participantsToRegister.length} participants to '${globalAhackathon.title}'.`);
  }

  if (globalAiSprint) {
    console.log(`\n👥 Registering participants to '${globalAiSprint.title}'...`);
    const participantsToRegister = DUMMY_USERS.slice(5, 25);
    for (const u of participantsToRegister) {
      await sql`
        INSERT INTO public.hackathon_registrations (hackathon_id, user_id, created_at)
        VALUES (${globalAiSprint.id}::uuid, ${u.id}, NOW() - (random() * interval '8 days'))
        ON CONFLICT (hackathon_id, user_id) DO NOTHING;
      `;
    }
    console.log(`✅ Registered ${participantsToRegister.length} participants to '${globalAiSprint.title}'.`);
  }

  if (nextGenMobile) {
    console.log(`\n👥 Registering participants to '${nextGenMobile.title}'...`);
    const participantsToRegister = DUMMY_USERS.slice(10, 26);
    for (const u of participantsToRegister) {
      await sql`
        INSERT INTO public.hackathon_registrations (hackathon_id, user_id, created_at)
        VALUES (${nextGenMobile.id}::uuid, ${u.id}, NOW() - (random() * interval '3 days'))
        ON CONFLICT (hackathon_id, user_id) DO NOTHING;
      `;
    }
  }

  // 4. Seed Submissions (Projects)
  if (globalAhackathon) {
    console.log(`\n🚀 Seeding project submissions for '${globalAhackathon.title}'...`);

    const SUBMISSIONS_AHACKATHON = [
      {
        user_id: "usr_aarav_sharma",
        title: "AgentCraft Studio",
        tagline: "Visual drag-and-drop IDE for building autonomous multi-agent swarms with tool use",
        description: `### What is AgentCraft Studio?
AgentCraft Studio is a next-generation visual workflow orchestrator built specifically for developers building autonomous AI agents. Rather than hand-coding brittle state machines in Python, builders can drag, connect, test, and deploy collaborative agent swarms through an intuitive infinite canvas.

### 🛠️ Key Features
- **Visual Swarm Topology**: Connect specialist agents (Coder, Auditor, Searcher, Executor) with dynamic routing.
- **Human-in-the-Loop Safeguards**: Interactive approval gates before agents perform irreversible actions (deploying code, spending tokens, sending emails).
- **Zero-Latency State Store**: Synchronized memory layers using serverless Neon PostgreSQL and vector caching.
- **1-Click SDK Export**: Export workflows into clean, type-safe Next.js and Python code.

### 💡 How We Built It
The frontend is built with Next.js 15 App Router, React Flow for node graph visualization, and TailwindCSS for smooth responsive styling. The execution backend uses FastAPI and LangGraph with parallel streaming over Server-Sent Events (SSE).`,
        demo_url: "https://agentcraft.demo.do4win.com",
        github_url: "https://github.com/agentcraft/studio",
        video_url: "https://youtube.com/watch?v=dQw4w9WgXcQ",
        cover_image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
        tech_stack: ["Next.js", "TypeScript", "LangChain", "FastAPI", "TailwindCSS", "Neon"],
      },
      {
        user_id: "usr_priya_patel",
        title: "NeuralScribe AI",
        tagline: "Autonomous medical transcription and clinical note generation with FHIR compliance",
        description: `### Clinical Burnout is Solved
Doctors spend over 2 hours on clinical documentation for every 1 hour of patient care. NeuralScribe listens to ambient clinical dialogues, identifies medical terminology with zero hallucination, and synthesizes structured Electronic Health Records (EHR) formatted directly in FHIR JSON.

### 🔒 Privacy & Architecture
- Local client-side Whisper model inference for initial voice sanitization.
- PII and HIPAA redactor layer removing patient identifiers before cloud summarization.
- Automated ICD-10 and CPT medical coding suggestions.

### ⚡ Technologies Used
Built with React, Next.js, Web Audio API, Python Whisper API, PyTorch, and deployed on serverless edge nodes.`,
        demo_url: "https://neuralscribe.demo.do4win.com",
        github_url: "https://github.com/neuralscribe/core",
        video_url: "https://loom.com/share/neuralscribe-demo",
        cover_image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80",
        tech_stack: ["Python", "Whisper", "FastAPI", "React", "PyTorch", "Docker"],
      },
      {
        user_id: "usr_rohan_gupta",
        title: "HyperQuery: Edge Vector Cache",
        tagline: "Sub-5ms distributed vector search and semantic caching layer for LLM applications",
        description: `### Why HyperQuery?
LLM API calls are slow and expensive. 40% of queries directed at enterprise chatbots are semantically identical or near duplicates of previously answered questions. HyperQuery sits as an ultra-fast semantic proxy in front of LLM endpoints.

### 🚀 Benchmarks
- **Average Cache Hit Latency**: 4.2ms
- **Cost Reduction**: Up to 65% on OpenAI/Anthropic API bills
- **Storage**: Powered by quantized HNSW indexes and WebAssembly in Rust`,
        demo_url: "https://hyperquery.demo.do4win.com",
        github_url: "https://github.com/hyperquery/hyperquery",
        video_url: "https://youtube.com/watch?v=dQw4w9WgXcQ",
        cover_image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80",
        tech_stack: ["Rust", "WebAssembly", "Cloudflare Workers", "Neon", "TypeScript"],
      },
      {
        user_id: "usr_marcus_johnson",
        title: "DevPulse Sentinel",
        tagline: "Proactive automated security auditing for pull requests using agentic static analysis",
        description: `### Autonomous Code Security
DevPulse Sentinel hooks directly into GitHub pull requests as a continuous security bot. Rather than basic regex lints, Sentinel uses deep AST analysis paired with reasoning models to discover business logic flaws, prompt injection vectors, and broken access control rules before code reaches staging.

### 🛡️ Features
- Generates reproducible PoC exploit test cases in pytest/vitest.
- Suggests one-click GitHub inline PR fixes.
- Scans smart contracts, REST endpoints, and GraphQL resolvers.`,
        demo_url: "https://devpulse.demo.do4win.com",
        github_url: "https://github.com/devpulse/sentinel",
        video_url: "https://loom.com/share/devpulse-sentinel",
        cover_image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80",
        tech_stack: ["Go", "GitHub Actions", "OpenAI", "PostgreSQL", "Docker"],
      },
      {
        user_id: "usr_chloe_martin",
        title: "EcoChain ESG Verifier",
        tagline: "Decentralized satellite and IoT verification for carbon credit provenance",
        description: `### Verifiable Carbon Offsets
EcoChain eliminates greenwashing by connecting satellite imagery from European Space Agency Sentinel-2 satellites with ground IoT soil moisture and canopy sensors to verify forestation preservation before carbon credits are minted.

### 🌍 Impact
- Verified over 1,200 hectares of biodiversity corridors.
- Immutable verification on chain with zero double-counting.
- Interactive map UI built with Mapbox GL and Next.js.`,
        demo_url: "https://ecochain.demo.do4win.com",
        github_url: "https://github.com/ecochain/verifier",
        video_url: "https://youtube.com/watch?v=dQw4w9WgXcQ",
        cover_image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80",
        tech_stack: ["Solidity", "Next.js", "Python", "Mapbox", "IPFS"],
      },
      {
        user_id: "usr_maya_lin",
        title: "VoicePilot 360",
        tagline: "Real-time conversational voice assistant with ultra-low latency WebRTC streaming",
        description: `### Natural Conversations with AI
VoicePilot 360 delivers human-level conversational timing with average response latencies below 320ms. Supporting natural interruptions, emotional inflection, and dynamic background noise cancellation.

### 🎙️ Architecture
- Bi-directional WebRTC audio pipe directly into an edge streaming model.
- Streaming token-to-speech audio rendering via ElevenLabs.
- Zero audio buffering artifacts.`,
        demo_url: "https://voicepilot.demo.do4win.com",
        github_url: "https://github.com/voicepilot/engine",
        video_url: "https://loom.com/share/voicepilot-demo",
        cover_image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&auto=format&fit=crop&q=80",
        tech_stack: ["WebRTC", "Next.js", "Python", "ElevenLabs", "TailwindCSS"],
      },
    ];

    for (const sub of SUBMISSIONS_AHACKATHON) {
      // Check if project title already exists for this hackathon
      const existing = await sql`
        SELECT id FROM public.hackathon_submissions
        WHERE hackathon_id = ${globalAhackathon.id}::uuid AND title = ${sub.title}
        LIMIT 1;
      `;
      if (existing.length === 0) {
        await sql`
          INSERT INTO public.hackathon_submissions (
            hackathon_id, user_id, title, tagline, description,
            demo_url, github_url, video_url, cover_image, tech_stack, created_at, updated_at
          ) VALUES (
            ${globalAhackathon.id}::uuid,
            ${sub.user_id},
            ${sub.title},
            ${sub.tagline},
            ${sub.description},
            ${sub.demo_url},
            ${sub.github_url},
            ${sub.video_url},
            ${sub.cover_image},
            ${sub.tech_stack}::text[],
            NOW() - (random() * interval '7 days'),
            NOW()
          );
        `;
      }
    }
    console.log(`✅ Seeded ${SUBMISSIONS_AHACKATHON.length} rich projects for '${globalAhackathon.title}'.`);
  }

  // 5. Seed Submissions for Global AI Sprint
  if (globalAiSprint) {
    console.log(`\n🚀 Seeding project submissions for '${globalAiSprint.title}'...`);

    const SUBMISSIONS_AI_SPRINT = [
      {
        user_id: "usr_sophia_chen",
        title: "AutoDoc Engineer",
        tagline: "Reverse engineers undocumented codebases into live interactive architecture diagrams",
        description: `### Code Comprehension Made Instant
Developers spend up to 70% of their onboarding time trying to understand large monolithic codebases. AutoDoc parses AST syntax trees, traces function calls across microservices, and generates navigable live architecture maps and API reference wikis automatically.`,
        demo_url: "https://autodoc.demo.do4win.com",
        github_url: "https://github.com/autodoc/engineer",
        video_url: "https://youtube.com/watch?v=dQw4w9WgXcQ",
        cover_image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80",
        tech_stack: ["TypeScript", "Tree-sitter", "Next.js", "Mermaid.js", "OpenAI"],
      },
      {
        user_id: "usr_oliver_davies",
        title: "FinAgent Quant",
        tagline: "Multi-agent fundamental and technical equity analysis engine with portfolio rebalancing",
        description: `### Institutional Research at Scale
FinAgent Quant coordinates five specialist AI agents: Macro Economist, 10-K SEC Filing Extractor, Technical Momentum Analyst, Risk Officer, and Executive Synthesizer. Delivers comprehensive investment memos and automated backtests in under 60 seconds.`,
        demo_url: "https://finagent.demo.do4win.com",
        github_url: "https://github.com/finagent/quant",
        video_url: "https://loom.com/share/finagent-demo",
        cover_image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80",
        tech_stack: ["Python", "Pandas", "FastAPI", "OpenAI", "Next.js"],
      },
      {
        user_id: "usr_lucas_schmidt",
        title: "OmniFlow BI",
        tagline: "Self-generating SQL analytics dashboards powered by in-memory DuckDB and LLM verification",
        description: `### Talk to your Data
Ask complex cohort retention, CAC/LTV, and conversion questions in plain English. OmniFlow schema-binds against your database, executes read-only queries with sub-second speeds using DuckDB, and automatically plots the exact optimal visualization.`,
        demo_url: "https://omniflow.demo.do4win.com",
        github_url: "https://github.com/omniflow/bi",
        video_url: "https://youtube.com/watch?v=dQw4w9WgXcQ",
        cover_image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80",
        tech_stack: ["Next.js", "DuckDB", "TypeScript", "Echarts", "PostgreSQL"],
      },
    ];

    for (const sub of SUBMISSIONS_AI_SPRINT) {
      const existing = await sql`
        SELECT id FROM public.hackathon_submissions
        WHERE hackathon_id = ${globalAiSprint.id}::uuid AND title = ${sub.title}
        LIMIT 1;
      `;
      if (existing.length === 0) {
        await sql`
          INSERT INTO public.hackathon_submissions (
            hackathon_id, user_id, title, tagline, description,
            demo_url, github_url, video_url, cover_image, tech_stack, created_at, updated_at
          ) VALUES (
            ${globalAiSprint.id}::uuid,
            ${sub.user_id},
            ${sub.title},
            ${sub.tagline},
            ${sub.description},
            ${sub.demo_url},
            ${sub.github_url},
            ${sub.video_url},
            ${sub.cover_image},
            ${sub.tech_stack}::text[],
            NOW() - (random() * interval '5 days'),
            NOW()
          );
        `;
      }
    }
    console.log(`✅ Seeded ${SUBMISSIONS_AI_SPRINT.length} rich projects for '${globalAiSprint.title}'.`);
  }

  // 6. Ensure standard tags exist
  const POPULAR_TAGS = [
    { name: "Artificial Intelligence", slug: "ai", category: "Technology" },
    { name: "Web3 & Blockchain", slug: "web3", category: "Technology" },
    { name: "Mobile Applications", slug: "mobile", category: "Platform" },
    { name: "DevOps & Cloud", slug: "devops", category: "Infrastructure" },
    { name: "Open Source", slug: "open-source", category: "Community" },
    { name: "HealthTech", slug: "healthtech", category: "Industry" },
    { name: "FinTech", slug: "fintech", category: "Industry" },
    { name: "Cybersecurity", slug: "cybersecurity", category: "Security" },
    { name: "Developer Tools", slug: "devtools", category: "Productivity" },
    { name: "AR / VR & Spatial", slug: "ar-vr", category: "Platform" },
  ];

  console.log("\n🏷️ Ensuring standard tags...");
  for (const t of POPULAR_TAGS) {
    await sql`
      INSERT INTO public.tags (id, name, slug, category, created_at)
      VALUES (gen_random_uuid(), ${t.name}, ${t.slug}, ${t.category}, NOW())
      ON CONFLICT (slug) DO NOTHING;
    `;
  }
  console.log("✅ Standard tags ensured.");

  // Summary counts
  const finalUsers = await sql`SELECT count(*) FROM public.users`;
  const finalRegistrations = await sql`SELECT count(*) FROM public.hackathon_registrations`;
  const finalSubmissions = await sql`SELECT count(*) FROM public.hackathon_submissions`;
  const finalHackathons = await sql`SELECT count(*) FROM public.hackathons`;

  console.log("\n🎉 SEEDING COMPLETED SUCCESSFULLY!");
  console.log(`📊 Total Users: ${finalUsers[0].count}`);
  console.log(`📊 Total Hackathons: ${finalHackathons[0].count}`);
  console.log(`📊 Total Registrations: ${finalRegistrations[0].count}`);
  console.log(`📊 Total Project Submissions: ${finalSubmissions[0].count}`);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
