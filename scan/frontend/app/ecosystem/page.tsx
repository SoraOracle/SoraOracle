'use client';

import { useState } from 'react';

interface EcosystemProject {
  name: string;
  description: string;
  category: string;
  logo: string;
  url: string;
}

const PLACEHOLDER_PROJECTS: EcosystemProject[] = [
  {
    name: "Sora Oracle SDK",
    description: "Permissionless oracle SDK for prediction markets on BNB Chain with AI-powered settlement",
    category: "Ecosystem Infrastructure & Tooling",
    logo: "🔮",
    url: "https://github.com/sora-oracle"
  },
  {
    name: "S402 Scan",
    description: "Analytics dashboard and ecosystem explorer for S402 payments on BNB Chain",
    category: "Ecosystem Infrastructure & Tooling",
    logo: "📊",
    url: "#"
  },
  {
    name: "AI Agent Composer",
    description: "Build and monetize AI agents with pay-per-use tool access via S402 micropayments",
    category: "Client-Side Integrations",
    logo: "🤖",
    url: "/composer"
  },
  {
    name: "Replicate Image Gen",
    description: "AI image generation powered by Replicate's Seedream 4 with S402 payment integration",
    category: "Services/Endpoints",
    logo: "🎨",
    url: "#"
  },
  {
    name: "Payment Facilitator",
    description: "Smart contract facilitator for S402 micropayments using USD1 stablecoin on BNB Chain",
    category: "Ecosystem Infrastructure & Tooling",
    logo: "💳",
    url: "#"
  },
  {
    name: "Multi-Wallet Parallelization",
    description: "Worker pool system enabling 10x faster parallel S402 payment processing",
    category: "Ecosystem Infrastructure & Tooling",
    logo: "⚡",
    url: "#"
  }
];

const CATEGORIES = [
  "All",
  "Client-Side Integrations",
  "Services/Endpoints",
  "Ecosystem Infrastructure & Tooling",
  "Learning & Community Resources"
];

export default function EcosystemPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = PLACEHOLDER_PROJECTS.filter(project => {
    const matchesCategory = selectedCategory === "All" || project.category === selectedCategory;
    const matchesSearch = 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pt-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-pixel mb-2">ECOSYSTEM</h1>
        <p className="text-sm text-gray-400">
          Projects building with S402 payment protocol on BNB Chain
        </p>
      </div>

      {/* Search */}
      <div className="flex-1 w-full md:max-w-md">
        <input
          type="text"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 bg-white dark:bg-black border border-gray-300 dark:border-gray-800 rounded-lg focus:outline-none focus:border-s402-orange"
        />
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              selectedCategory === category
                ? 'bg-s402-orange text-white'
                : 'bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-4 shadow-soft dark:shadow-none">
          <div className="text-xs text-gray-500 uppercase mb-1">Total Projects</div>
          <div className="text-2xl font-bold">{PLACEHOLDER_PROJECTS.length}</div>
        </div>
        <div className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-4 shadow-soft dark:shadow-none">
          <div className="text-xs text-gray-500 uppercase mb-1">Integrations</div>
          <div className="text-2xl font-bold">
            {PLACEHOLDER_PROJECTS.filter(p => p.category === "Client-Side Integrations").length}
          </div>
        </div>
        <div className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-4 shadow-soft dark:shadow-none">
          <div className="text-xs text-gray-500 uppercase mb-1">Services</div>
          <div className="text-2xl font-bold">
            {PLACEHOLDER_PROJECTS.filter(p => p.category === "Services/Endpoints").length}
          </div>
        </div>
        <div className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-4 shadow-soft dark:shadow-none">
          <div className="text-xs text-gray-500 uppercase mb-1">Infrastructure</div>
          <div className="text-2xl font-bold">
            {PLACEHOLDER_PROJECTS.filter(p => p.category === "Ecosystem Infrastructure & Tooling").length}
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No projects found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project, index) => (
            <a
              key={index}
              href={project.url}
              target={project.url.startsWith('http') ? '_blank' : '_self'}
              rel={project.url.startsWith('http') ? 'noopener noreferrer' : ''}
              className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-6 shadow-soft dark:shadow-none hover:border-s402-orange transition-all duration-300 group block"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-s402-orange/10 rounded-full flex items-center justify-center text-2xl flex-shrink-0">
                  {project.logo}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold mb-1 group-hover:text-s402-orange transition-colors truncate">
                    {project.name}
                  </h3>
                  <div className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 dark:bg-gray-900 rounded inline-block">
                    {project.category.split(' ')[0]}
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                {project.description}
              </p>

              <div className="mt-4 text-sm text-s402-orange group-hover:underline">
                Learn more →
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Footer Note */}
      <div className="mt-8 p-6 bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg shadow-soft dark:shadow-none">
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          💡 This ecosystem page will automatically pull data from the official S402 GitHub repository in production.
          <br />
          Currently showing placeholder data for demonstration purposes.
        </p>
      </div>
    </div>
  );
}
