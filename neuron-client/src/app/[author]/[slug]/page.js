"use client";

import React, { useEffect, useState } from "react";
import { ContractStore } from "../../data/contracts";
import { useParams } from "next/navigation";
import axios from "axios";
import { motion } from "framer-motion";

const Page = () => {
  // States
  const { author, slug } = useParams();
  const [sourceCode, setSourceCode] = useState("");
  const [showFullCode, setShowFullCode] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [aiError, setAiError] = useState("");
  const [showAiResponse, setShowAiResponse] = useState(false);
  const [activeTab, setActiveTab] = useState("write");
  const [aiQuery, setAiQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);


  // Find contract data
  const contracts = ContractStore.find((ct) =>
    ct.contracts.some((c) => c.identifier === `${author}/${slug}`)
  );
  const contract = contracts?.contracts.find(
    (c) => c.identifier === `${author}/${slug}`
  );

  // Fetch source code
  useEffect(() => {
    const fetchCode = async () => {
      try {
        const res = await axios.post("/api/compile/code", {
          slug: contract.path,
        });
        if (res.status === 200) {
          setSourceCode(res.data.contract);
        }
      } catch (e) {
        console.error("Error fetching code:", e);
      }
    };
    if (contract) fetchCode();
  }, [contract]);

  // AI Query Handler
  const handleAiQuery = async (query) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setAiError("");
    
    try {
      const context = `
Source Code:
${sourceCode}

Available Functions:
Write Functions:
${contract.source.functions.write.map(f => `- ${f.function}: ${f.signature}`).join('\n')}

Read Functions:
${contract.source.functions.read.map(f => `- ${f.function}: ${f.signature}`).join('\n')}

Contract Name: ${contract.source.name}
Contract Description: ${contract.source.description}
`;

      const prompt = `You are a smart contract expert assistant. Analyze the following smart contract and answer this question: "${query}"

${context}

Please provide a detailed but concise explanation, focusing on:
1. Direct answers to the question
2. Code references when relevant
3. Security implications if applicable
4. Best practices and recommendations

Keep the response technical but understandable.`;

      const response = await axios({
        url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyCHK_9m7dwti-kYYWmr-ciR-Kp9_QTgvOc",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          contents: [{ parts: [{ text: prompt }] }],
        },
      });

      setAiResponse(response.data.candidates[0].content.parts[0].text);
      setShowAiResponse(true);
      setAiQuery("");
    } catch (error) {
      console.error("Error processing AI query:", error);
      setAiError("Failed to get AI response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!contract) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-xl font-medium">Contract not found</div>
      </div>
    );
  }
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
  
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Add this function with other handlers
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 bg-gray-900/95 p-8 rounded-xl shadow-2xl border border-gray-800/50 backdrop-blur-sm"
        >
          <div className="border-b border-gray-700/50 pb-6 mb-6">
            <h1 className="text-4xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
              {contract.source.name}
            </h1>
            <p className="text-lg text-gray-400 mb-4 leading-relaxed">
              {contract.source.description}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-indigo-950/50 text-indigo-300 px-4 py-2 rounded-lg border border-indigo-500/20 shadow-lg shadow-indigo-900/10">
              <span className="text-sm font-semibold">Version {contract.version}</span>
            </div>
          </div>
        </motion.div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-12 gap-8">
          {/* Left Column */}
          <div className="col-span-9 space-y-8">
            {/* Content Section */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="prose prose-invert max-w-none bg-gray-900/95 p-8 rounded-xl shadow-2xl border border-gray-800/50 backdrop-blur-sm"
            >
              {contract.source.content.map((item, index) => {
                switch (item.tag) {
                  case "h1":
                    return (
                      <h1 key={index} className="text-3xl font-bold mt-6 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
                        {item.content}
                      </h1>
                    );
                  case "h2":
                    return (
                      <h2 key={index} className="text-2xl font-semibold mt-6 mb-3 text-gray-200">
                        {item.content}
                      </h2>
                    );
                  case "p":
                    return (
                      <p key={index} className="mb-4 text-gray-300 leading-relaxed">
                        {item.content}
                      </p>
                    );
                  case "ul":
                    return (
                      <div
                        key={index}
                        className="mb-4 text-gray-300 [&>ul]:list-disc [&>ul]:pl-4 space-y-2"
                        dangerouslySetInnerHTML={{ __html: item.content }}
                      />
                    );
                  default:
                    return null;
                }
              })}
            </motion.div>

            {/* Functions Section */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-gray-900/95 p-8 rounded-xl shadow-2xl border border-gray-800/50 backdrop-blur-sm"
            >
              {/* Functions Header */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700/50">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
                  Functions
                </h2>
                <div className="flex gap-2 p-1 bg-gray-800/50 rounded-lg backdrop-blur-sm">
                  <button
                    onClick={() => setActiveTab("write")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeTab === "write"
                        ? "bg-indigo-950/90 text-indigo-300 shadow-lg shadow-indigo-900/20 border border-indigo-500/20"
                        : "text-gray-400 hover:text-indigo-300"
                    }`}
                  >
                    Write Functions
                  </button>
                  <button
                    onClick={() => setActiveTab("read")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeTab === "read"
                        ? "bg-emerald-950/90 text-emerald-300 shadow-lg shadow-emerald-900/20 border border-emerald-500/20"
                        : "text-gray-400 hover:text-emerald-300"
                    }`}
                  >
                    Read Functions
                  </button>
                </div>
              </div>

              {/* Function Cards */}
              <div className="space-y-4">
                {activeTab === "write" && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid gap-4"
                  >
                    {contract.source.functions.write.map((func, index) => (
                      <div
                        key={index}
                        className="bg-gray-800/50 p-6 rounded-lg border border-gray-700/50 hover:border-indigo-500/30 transition-all duration-200 shadow-lg hover:shadow-indigo-900/10"
                      >
                        <h4 className="font-medium text-indigo-300 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                          {func.function}
                        </h4>
                        <code className="text-sm text-gray-300 block mt-3 bg-gray-900/70 p-4 rounded-lg font-mono border border-gray-700/30">
                          {func.signature}
                        </code>
                      </div>
                    ))}
                  </motion.div>
                )}

                {activeTab === "read" && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid gap-4"
                  >
                    {contract.source.functions.read.map((func, index) => (
                      <div
                        key={index}
                        className="bg-gray-800/50 p-6 rounded-lg border border-gray-700/50 hover:border-emerald-500/30 transition-all duration-200 shadow-lg hover:shadow-emerald-900/10"
                      >
                        <h4 className="font-medium text-emerald-300 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          {func.function}
                        </h4>
                        <code className="text-sm text-gray-300 block mt-3 bg-gray-900/70 p-4 rounded-lg font-mono border border-gray-700/30">
                          {func.signature}
                        </code>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* AI Query Section */}
              <div className="mt-8 pt-6 border-t border-gray-700/50">
                <div className="relative">
                  <input
                    type="text"
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    placeholder="Ask anything about these functions..."
                    className="w-full bg-gray-800/50 text-gray-200 placeholder-gray-500 px-4 py-3 pr-12 rounded-lg border border-gray-700/50 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all duration-200"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !isLoading) {
                        handleAiQuery(aiQuery);
                      }
                    }}
                  />
                  <button
                    className={`absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-indigo-300 transition-colors p-2 hover:bg-indigo-500/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                    onClick={() => handleAiQuery(aiQuery)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                  </button>
                </div>

                {aiError && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200"
                  >
                    {aiError}
                  </motion.div>
                )}

                {showAiResponse && !aiError && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 bg-gray-800/50 border border-gray-700/50 rounded-lg shadow-lg"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-indigo-300 font-medium flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        AI Response
                      </h4>
                      <button
                        onClick={() => setShowAiResponse(false)}
                        className="text-gray-500 hover:text-gray-400 p-1 hover:bg-gray-700/50 rounded transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="prose prose-invert max-w-none">
                      <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{aiResponse}</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Right Column - Resources */}
          <div className="col-span-3">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gray-900/95 p-6 rounded-xl shadow-2xl border border-gray-800/50 backdrop-blur-sm sticky top-4"
            >
              <h2 className="text-xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300 border-b border-gray-700/50 pb-4">
                Resources
              </h2>
              <div className="flex flex-col gap-3">
                {contract.source.resources.map((resource, index) => (
                  <a
                    key={index}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 transition-all duration-200 flex items-center p-2 hover:bg-indigo-500/10 rounded-lg group"
                  >
                    <svg
                      className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    {resource.title}
                  </a>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Source Code Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 bg-gray-900/95 rounded-xl shadow-2xl border border-gray-800/50 backdrop-blur-sm overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
              Source Code
            </h2>
            <div className="flex gap-3">
              <button className="flex items-center px-4 py-2 bg-indigo-600/90 hover:bg-indigo-700/90 text-white rounded-lg transition-colors shadow-lg shadow-indigo-900/20">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Customize with AI
              </button>
              <button className="flex items-center px-4 py-2 bg-emerald-600/90 hover:bg-emerald-700/90 text-white rounded-lg transition-colors shadow-lg shadow-emerald-900/20">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Deploy
              </button>
              <button className="flex items-center px-4 py-2 bg-purple-600/90 hover:bg-purple-700/90 text-white rounded-lg transition-colors shadow-lg shadow-purple-900/20">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Remix
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gray-800/50 border-r border-gray-700/50 flex flex-col items-end px-4 py-4 text-gray-500 font-mono text-sm">
              {sourceCode
                .split("\n")
                .slice(0, showFullCode ? undefined : 10)
                .map((_, i) => (
                  <div key={i} className="leading-7">
                    {i + 1}
                  </div>
                ))}
            </div>

            <div className="pl-16 py-4 overflow-x-auto">
              <div className="px-4">
                <pre className="font-mono text-sm leading-7 text-gray-300">
                  <code>
                    {showFullCode ? (
                      sourceCode
                    ) : (
                      <>
                        {sourceCode.split("\n").slice(0, 10).join("\n")}
                        {sourceCode.split("\n").length > 10 && (
                          <div className="mt-4 text-gray-400 border-t border-gray-700/50 pt-4 text-xs">
                            <span className="bg-gray-800/50 px-3 py-1.5 rounded-full">
                              ... {sourceCode.split("\n").length - 10} more lines
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </code>
                </pre>
              </div>
            </div>

            {sourceCode.split("\n").length > 10 && (
              <div className="p-4 border-t border-gray-700/50 text-center bg-gray-800/50">
                <button
                  onClick={() => setShowFullCode((prev) => !prev)}
                  className="px-4 py-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center mx-auto gap-2 hover:bg-indigo-500/10 rounded-lg"
                >
                  {showFullCode ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                      Show Less
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      View Full Source Code
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
{showScrollTop && (
  <motion.button
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    onClick={scrollToTop}
    className="fixed right-8 bottom-8 p-3 bg-indigo-600/90 hover:bg-indigo-700/90 text-white rounded-lg shadow-lg shadow-indigo-900/20 backdrop-blur-sm border border-indigo-500/20 transition-all duration-200 hover:shadow-xl group"
    aria-label="Return to top"
  >
    <svg 
      className="w-6 h-6 transform group-hover:-translate-y-1 transition-transform duration-200" 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M5 10l7-7m0 0l7 7m-7-7v18" 
      />
    </svg>
  </motion.button>
)}
    </div>
  );
};

export default Page;