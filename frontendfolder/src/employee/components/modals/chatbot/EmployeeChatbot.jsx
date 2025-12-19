import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import { FiPaperclip, FiSend, FiMoreHorizontal, FiX, FiChevronDown, FiVolume2 } from "react-icons/fi";
import MapLogo from "../../../../shared/assets/MapLogo.png";
import styles from "./EmployeeChatbot.module.css";
import axios from 'axios';
import { API_CONFIG } from '../../../../config/environment.js';

// Natural language date parser
function parseNaturalDate(input) {
  const lowerInput = input.toLowerCase().trim();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Handle "tomorrow"
  if (lowerInput === 'tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow;
  }
  
  // Handle "next week", "next month", "next year"
  if (lowerInput.includes('next week')) {
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    return nextWeek;
  }
  
  if (lowerInput.includes('next month')) {
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);
    return nextMonth;
  }
  
  if (lowerInput.includes('next year')) {
    const nextYear = new Date(today);
    nextYear.setFullYear(today.getFullYear() + 1);
    return nextYear;
  }
  
  // Try to parse standard date formats first
  const standardDate = new Date(input);
  if (!isNaN(standardDate.getTime())) {
    standardDate.setHours(0, 0, 0, 0);
    return standardDate;
  }
  
  // Extract year if present
  const yearMatch = input.match(/\b(20\d{2})\b/);
  let year = yearMatch ? parseInt(yearMatch[1]) : today.getFullYear();
  
  // Month names mapping
  const months = {
    'january': 0, 'jan': 0,
    'february': 1, 'feb': 1,
    'march': 2, 'mar': 2,
    'april': 3, 'apr': 3,
    'may': 4,
    'june': 5, 'jun': 5,
    'july': 6, 'jul': 6,
    'august': 7, 'aug': 7,
    'september': 8, 'sep': 8, 'sept': 8,
    'october': 9, 'oct': 9,
    'november': 10, 'nov': 10,
    'december': 11, 'dec': 11
  };
  
  // Try to find month and day
  let month = null;
  let day = null;
  
  for (const [monthName, monthIndex] of Object.entries(months)) {
    if (lowerInput.includes(monthName)) {
      month = monthIndex;
      break;
    }
  }
  
  // Extract day number
  const dayMatch = input.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (dayMatch) {
    day = parseInt(dayMatch[1]);
  }
  
  // If we have month and day, create the date
  if (month !== null && day !== null) {
    // Check if "next year" is mentioned
    if (lowerInput.includes('next year')) {
      year = today.getFullYear() + 1;
    }
    // If date would be in the past this year, assume next year
    else {
      const testDate = new Date(year, month, day);
      if (testDate < today) {
        year = today.getFullYear() + 1;
      }
    }
    
    const parsedDate = new Date(year, month, day);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }
  
  // If only month is provided, use the 1st of that month
  if (month !== null && day === null) {
    if (lowerInput.includes('next year')) {
      year = today.getFullYear() + 1;
    } else {
      const testDate = new Date(year, month, 1);
      if (testDate < today) {
        year = today.getFullYear() + 1;
      }
    }
    return new Date(year, month, 1);
  }
  
  return null;
}

// Ticket form constants
const TICKET_CATEGORIES = [
  'IT Support',
  'Asset Check In',
  'Asset Check Out',
  'New Budget Proposal',
  'Others'
];

const IT_SUPPORT_SUBCATEGORIES = [
  'Technical Assistance',
  'Software Installation/Update',
  'Hardware Troubleshooting',
  'Email/Account Access Issue',
  'Internet/Network Connectivity Issue',
  'Printer/Scanner Setup or Issue',
  'System Performance Issue',
  'Virus/Malware Check',
  'IT Consultation Request',
  'Data Backup/Restore'
];

const ASSET_SUBCATEGORIES = [
  'Laptop',
  'Printer',
  'Projector',
  'Mouse',
  'Keyboard'
];

const ASSET_ISSUE_TYPES = [
  'Not Functioning',
  'Missing Accessories (e.g., charger, case)',
  'Physical Damage (e.g., cracked screen, broken keys)',
  'Battery Issue (e.g., not charging, quick drain)',
  'Software Issue (e.g., system crash, unable to boot)',
  'Screen/Display Issue (e.g., flickering, dead pixels)',
  'Other'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv'
];
const ALLOWED_FILE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv'];

const LOCATIONS = [
  'Main Office - 1st Floor',
  'Main Office - 2nd Floor',
  'Main Office - 3rd Floor',
  'Branch Office - North',
  'Branch Office - South',
  'Warehouse',
  'Remote/Home Office'
];

const MOCK_ASSETS = {
  'Laptop': [
    { name: 'Dell Latitude 5420', serialNumber: 'DL-2024-001' },
    { name: 'HP ProBook 450 G9', serialNumber: 'HP-2024-002' },
    { name: 'Lenovo ThinkPad X1', serialNumber: 'LN-2024-003' }
  ],
  'Printer': [
    { name: 'HP LaserJet Pro M404dn', serialNumber: 'PR-2024-001' },
    { name: 'Canon imageCLASS MF445dw', serialNumber: 'PR-2024-002' }
  ],
  'Projector': [
    { name: 'Epson PowerLite 2247U', serialNumber: 'PJ-2024-001' },
    { name: 'BenQ MH535A', serialNumber: 'PJ-2024-002' }
  ],
  'Mouse': [
    { name: 'Logitech MX Master 3', serialNumber: 'MS-2024-001' },
    { name: 'Microsoft Surface Mouse', serialNumber: 'MS-2024-002' }
  ],
  'Keyboard': [
    { name: 'Logitech K380', serialNumber: 'KB-2024-001' },
    { name: 'Microsoft Ergonomic Keyboard', serialNumber: 'KB-2024-002' }
  ]
};

const DEVICE_TYPES = ['Laptop', 'Printer', 'Projector', 'Monitor', 'Other'];

const EmployeeChatbot = ({ closeModal }) => {
  const [messages, setMessages] = useState([]);
  const [faqs, setFaqs] = useState([]);
  
  // Ticket creation conversation state
  const [ticketCreation, setTicketCreation] = useState({
    active: false,
    step: null, // 'subject', 'category', 'subcategory', 'description', 'device_type', etc.
    data: {},
    attachments: [], // Store uploaded files
  });
  
  const welcomeMessage = {
    text: "Hi there! 👋 I'm PAXI, your go-to support buddy.\nHow can I assist you today?",
    sender: "bot",
    isList: false,
    suggestions: [
      { label: 'Browse FAQs', type: 'redirect', route: '/employee/frequently-asked-questions' },
      { label: 'Submit a Ticket', type: 'start-ticket', value: 'new' },
      { label: 'View My Tickets', type: 'redirect', route: '/employee/active-tickets/all-active-tickets' }
    ]
  };

  // Fallback default messages collection (used by local matcher)
  const defaultMessages = [welcomeMessage];

  // Build a compact system prompt from available FAQs to guide the external LLM
  const buildFAQPrompt = (faqsList) => {
    if (!faqsList || faqsList.length === 0) return 'You are a helpful support assistant for employees. Answer concisely and avoid external links.';
    const top = faqsList.slice(0, 8).map((f, i) => `${i + 1}. ${f.question}`).join('\n');
    return `You are a helpful support assistant for employees. The following are known FAQ titles to refer to when answering user queries:\n${top}\nIf the user asks a question answered by these FAQs, respond using that FAQ content.`;
  };

  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const inputRef = useRef(null);
  const [menuOpenIndex, setMenuOpenIndex] = useState(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Handle scroll detection for down arrow button
  useEffect(() => {
    const chatMessages = chatMessagesRef.current;
    if (!chatMessages) return;

    const handleScroll = () => {
      // Since we use column-reverse, scrollTop > 0 means scrolled away from bottom
      setShowScrollButton(chatMessages.scrollTop > 100);
    };

    chatMessages.addEventListener('scroll', handleScroll);
    return () => chatMessages.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = 0; // For column-reverse
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Show welcome message with typing effect on open
  useEffect(() => {
    if (messages.length === 0) {
      setIsTyping(true);
      setTimeout(() => {
        setMessages([welcomeMessage]);
        setIsTyping(false);
      }, 900);
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    try {
      const isAuth = !!localStorage.getItem('loggedInUser');
      if (!isAuth) return; // do not persist chat history for unauthenticated users
      localStorage.setItem("chatbotMessages", JSON.stringify(messages));
    } catch (e) {
      // ignore storage errors
    }
  }, [messages]);

  useEffect(() => {
    const fetchFAQs = async () => {
      try {
        // Try to get token from localStorage first, then cookies
        let token = localStorage.getItem("access_token");
        if (!token && typeof document !== 'undefined' && document.cookie) {
          try {
            const match = document.cookie.match(/(?:^|; )access_token=([^;]+)/);
            if (match && match[1]) token = decodeURIComponent(match[1]);
          } catch (e) {
            // ignore cookie parsing errors
          }
        }
        if (!token) {
          console.warn("No access token found. FAQs may not load.");
          // Continue anyway — the request might work with session cookies
        }

    const baseUrl = API_CONFIG.BACKEND.BASE_URL || '';
    const articlesUrl = `${baseUrl.replace(/\/$/, '')}/api/articles/`;

    // If BASE_URL is empty string, fall back to relative path
    const requestUrl = baseUrl ? articlesUrl : '/api/articles/';

    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await axios.get(requestUrl, {
          headers,
          withCredentials: true,
          validateStatus: (status) => status < 500, // Accept all 2xx and 4xx responses
        });

        console.log("Full API Response:", response);
        console.log("Request Config:", response.config);
        console.log("Response Headers:", response.headers);

        // Check if the response is HTML (indicating an error or redirect)
        if (typeof response.data === "string" && response.data.startsWith("<!doctype html>")) {
          console.error("Received HTML response instead of JSON. Possible redirect or error page:", response.data);
          if (response.request?.res?.responseUrl) {
            console.error("Redirected to:", response.request.res.responseUrl);
          }
          return;
        }

        if (response.status === 401 || response.status === 403) {
          console.error("Authentication error. Please check your access token.");
          return;
        }

        if (response.headers["content-type"]?.includes("application/json")) {
          // Map backend KnowledgeArticle fields to the front-end FAQ shape and
          // normalize visibility check (backend uses 'Employee' capitalization).
          const mapped = response.data
            .map((a) => ({
              id: a.id,
              question: a.subject || '',
              answer: a.description || '',
              visibility: a.visibility || '',
              is_archived: !!a.is_archived,
            }))
            .filter((faq) => !faq.is_archived && (faq.visibility || '').toLowerCase() === 'employee');

          console.log(`✅ Chatbot loaded ${mapped.length} Knowledge Base articles (employee-visible, non-archived):`);
          console.table(mapped.map((faq, idx) => ({
            '#': idx + 1,
            'Article ID': faq.id,
            'Subject': faq.question.slice(0, 60) + (faq.question.length > 60 ? '...' : ''),
            'Answer Length': `${faq.answer.length} chars`,
            'Visibility': faq.visibility
          })));
          console.log('These articles will be used for FAQ matching in the chatbot.');
          setFaqs(mapped);
        } else {
          console.error("Unexpected response format. Expected JSON but received:", response.data);
        }
      } catch (error) {
        if (error.response) {
          console.error("Error response from server:", error.response);
        } else if (error.request) {
          console.error("No response received from server:", error.request);
        } else {
          console.error("Error setting up the request:", error.message);
        }
      }
    };

    fetchFAQs();
  }, []);

  const FAQ_SYSTEM_PROMPT = useMemo(() => buildFAQPrompt(faqs), [faqs]);

  const formatTime = (date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes}${ampm}`;
  };

  const formatDateDisplay = (date) => {
    const month = date.toLocaleString("default", { month: "long" }).toUpperCase();
    const day = date.getDate();
    const year = date.getFullYear();
    const weekday = date.toLocaleString("default", { weekday: "long" }).toUpperCase();
    return `${month} ${day}, ${year} | ${weekday}`;
  };
  // Ensure the OpenRouter API key is set in your .env file.
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (import.meta.env.DEV) {
    console.debug("OpenRouter API Key present:", !!import.meta.env.VITE_OPENROUTER_API_KEY);
  }

  // Enhanced local FAQ matcher with weighted scoring
  const findFAQAnswer = (userMessage) => {
    if (!userMessage) return null;
    const text = userMessage.toLowerCase().trim();

    console.log(`🔍 Chatbot FAQ Search: "${userMessage}"`);
    console.log(`📚 Available KB articles for matching: ${faqs?.length || 0}`);

    // Handle greetings
    if (text.length < 3) {
      const greetingRe = /^(hi|hello|hey|hey there|good morning|good afternoon|good evening)[.!]?$/i;
      if (greetingRe.test(text)) {
        console.log('✅ Detected greeting, returning canned greeting.');
        return { answer: defaultMessages[0].text, question: "greeting", faq: null };
      }
      return null;
    }

    if (!faqs || faqs.length === 0) {
      console.warn('⚠️ No KB articles available for FAQ matching!');
      return null;
    }

    // Tokenize user input (ignore common stop words)
    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'as', 'by', 'from', 'that', 'this', 'it', 'be', 'are', 'was', 'were', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can']);
    const tokens = text.split(/\W+/).filter(t => t.length > 2 && !stopWords.has(t));
    
    if (tokens.length === 0) return null;

    // Score each FAQ
    let best = { score: 0, answer: null, question: null };
    for (const faq of faqs) {
      const q = (faq.question || '').toLowerCase();
      const a = (faq.answer || '').toLowerCase();
      let score = 0;

      // Exact phrase match in question (highest weight)
      if (q.includes(text)) score += 100;
      
      // Exact phrase match in answer (high weight)
      if (a.includes(text)) score += 80;

      // User query is substring of FAQ question (very relevant)
      if (text.includes(q) && q.length > 5) score += 90;

      // Token matching with position weighting
      tokens.forEach((tok, idx) => {
        const posWeight = 1 + (tokens.length - idx) * 0.1; // Earlier tokens weighted higher
        
        // Question match (higher weight)
        if (q.includes(tok)) score += 10 * posWeight;
        
        // Answer match (lower weight)
        if (a.includes(tok)) score += 5 * posWeight;
        
        // Exact word boundary match (bonus)
        const wordBoundaryRegex = new RegExp(`\\b${tok}\\b`);
        if (wordBoundaryRegex.test(q)) score += 5 * posWeight;
        if (wordBoundaryRegex.test(a)) score += 3 * posWeight;
      });

      // Length similarity bonus (prefer FAQs with similar length to query)
      const lengthDiff = Math.abs(q.length - text.length);
      if (lengthDiff < 20) score += 5;

      if (score > best.score) {
        best = { score, answer: faq.answer, question: faq.question, faq }; // Include full FAQ object for context
      }
    }

    // Require minimum score threshold
    const threshold = tokens.length > 3 ? 15 : 10;
    if (best.score >= threshold) {
      console.log(`✅ FAQ Match Found! Score: ${best.score.toFixed(1)} (threshold: ${threshold})`);
      console.log(`   Matched KB Article: "${best.question?.slice(0, 100)}${best.question?.length > 100 ? '...' : ''}"`);
      console.log(`   Answer preview: "${best.answer?.slice(0, 150)}${best.answer?.length > 150 ? '...' : ''}"`);
      return { answer: best.answer, question: best.question, faq: best.faq }; // Return full context
    }
    
    console.log(`❌ No FAQ match found. Best score: ${best.score.toFixed(1)} (threshold: ${threshold})`);
    if (best.question) {
      console.log(`   Closest match was: "${best.question.slice(0, 80)}${best.question.length > 80 ? '...' : ''}" (score: ${best.score.toFixed(1)})`);
    }
    console.log(`   Search tokens used: [${tokens.join(', ')}]`);
    return null;
  };

  const fetchOpenRouterResponse = async (userMessage) => {
    // Try local FAQ lookup first — quicker and avoids external API if we already know the answer
    // If the user explicitly asks to list FAQs, return a list from the loaded `faqs`.
    const listFaqsRe = /\b(list|show|display|what are)\b.*\b(faqs|faq|knowledge articles|articles|knowledge base)\b/i;
    if (listFaqsRe.test(userMessage)) {
      if (!faqs || faqs.length === 0) return { text: "There are no knowledge base articles available right now.", matchedQuestion: null };
      // Return a friendly bullet list (short subjects)
      const items = faqs.map((f, i) => `${i + 1}. ${f.question}`);
      return { text: `Here are the available knowledge base articles:\n\n${items.join('\n')}`, matchedQuestion: "list_faqs" };
    }

    const localFirst = findFAQAnswer(userMessage);
    // If we have a local FAQ hit, attempt to paraphrase it so responses feel fresh
    if (localFirst) {
      console.log('✅ Using FAQ answer (will paraphrase if API key available)');
      const answerText = typeof localFirst === 'string' ? localFirst : localFirst.answer;
      const matchedQuestion = typeof localFirst === 'object' ? localFirst.question : null;
      
      // If no API key, return the raw local answer
      if (!apiKey) {
        console.log('⚠️ No OpenRouter API key - returning raw FAQ answer');
        return { text: answerText, matchedQuestion };
      }

      // Build a paraphrase prompt that keeps technical tokens intact
      const paraphraseSystem = `You are a helpful assistant that rewrites support FAQ answers into a friendly, conversational single-paragraph response appropriate for an employee. Preserve any technical tokens (code snippets, commands, filenames, product names, acronyms, URLs, tokens with slashes or dots, words in ALL CAPS, or anything enclosed in backticks) verbatim; do NOT translate or alter them. Only paraphrase the human-readable sentences around those technical tokens. Keep the meaning identical and the length similar. Use natural variation (synonyms, alternate sentence order) so repeated questions get slightly different phrasing.`;

      try {
        const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: paraphraseSystem },
              { role: "user", content: `Question: ${userMessage}\n\nFAQ answer:\n${answerText}` },
            ],
          }),
        });

        const data = await resp.json();
        if (data?.choices?.[0]?.message?.content) {
          const paraphrased = data.choices[0].message.content.trim();
          // Safety: if paraphrase is suspiciously short/empty, fallback to original
          if (paraphrased.length < 10) return { text: answerText, matchedQuestion };
          return { text: paraphrased, matchedQuestion };
        }
        return { text: answerText, matchedQuestion };
      } catch (e) {
        console.error('Paraphrase request failed, returning original FAQ answer', e);
        return { text: answerText, matchedQuestion };
      }
    }

    // If we don't have an OpenRouter API key and no local match, fall back to a generic message
    if (!apiKey) {
      return { text: "Please refer to our support team.", matchedQuestion: null };
    }

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: FAQ_SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
        }),
      });

      const data = await response.json();
      if (data.error) {
        // If the API reports missing auth, fall back to FAQ
        const msg = data.error.message || "Unknown error from API.";
        if (/auth|credential/i.test(msg)) {
          const local = findFAQAnswer(userMessage);
          if (local) {
            const answerText = typeof local === 'string' ? local : local.answer;
            const matchedQuestion = typeof local === 'object' ? local.question : null;
            return { text: answerText, matchedQuestion };
          }
          return { text: "Please refer to our support team.", matchedQuestion: null };
        }
        return { text: `Error: ${msg}`, matchedQuestion: null };
      }
      return { text: data.choices?.[0]?.message?.content || "Sorry, I couldn't get a response.", matchedQuestion: null };
    } catch (error) {
      // Network or other error: fallback to local FAQ
      const local = findFAQAnswer(userMessage);
      if (local) {
        const answerText = typeof local === 'string' ? local : local.answer;
        const matchedQuestion = typeof local === 'object' ? local.question : null;
        return { text: answerText, matchedQuestion };
      }
      return { text: "Sorry, there was an error connecting to the support service.", matchedQuestion: null };
    }
  };

  // Generate context-aware suggestions based on the matched KB article
  const getContextualSuggestions = (matchedQuestion) => {
    if (!matchedQuestion) return getDefaultSuggestions();
    
    const q = matchedQuestion.toLowerCase();
    
    // Ticket-related questions
    if (q.includes('ticket') || q.includes('submit')) {
      if (q.includes('categories') || q.includes('issues')) {
        return [
          { label: 'Submit a Ticket', type: 'start-ticket', value: 'new' },
          { label: 'View My Tickets', type: 'redirect', route: '/employee/active-tickets/all-active-tickets' },
          { label: 'Browse All FAQs', type: 'redirect', route: '/employee/frequently-asked-questions' }
        ];
      }
      if (q.includes('track') || q.includes('status')) {
        return [
          { label: 'View My Tickets', type: 'redirect', route: '/employee/active-tickets/all-active-tickets' },
          { label: 'Submit New Ticket', type: 'start-ticket', value: 'new' },
          { label: 'Browse FAQs', type: 'redirect', route: '/employee/frequently-asked-questions' }
        ];
      }
      if (q.includes('attach') || q.includes('file')) {
        return [
          { label: 'Submit a Ticket', type: 'start-ticket', value: 'new' },
          { label: 'View Ticket Guidelines', type: 'redirect', route: '/employee/frequently-asked-questions' },
          { label: 'My Tickets', type: 'redirect', route: '/employee/active-tickets/all-active-tickets' }
        ];
      }
    }
    
    // Password/account questions
    if (q.includes('password') || q.includes('profile') || q.includes('account')) {
      return [
        { label: 'Go to Settings', type: 'redirect', route: '/employee/settings' },
        { label: 'View Account FAQs', type: 'redirect', route: '/employee/frequently-asked-questions' },
        { label: 'Submit a Ticket', type: 'start-ticket', value: 'new' }
      ];
    }
    
    // General FAQ browsing
    return [
      { label: 'Browse All FAQs', type: 'redirect', route: '/employee/frequently-asked-questions' },
      { label: 'Submit a Ticket', type: 'start-ticket', value: 'new' },
      { label: 'View My Tickets', type: 'redirect', route: '/employee/active-tickets/all-active-tickets' }
    ];
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    const userMessageObj = {
      text: userMessage,
      sender: "user",
      time: new Date(),
    };

    setMessages((prev) => [...prev, userMessageObj]);
    setInputValue("");
    setIsTyping(true);

    try {
      // Check if we're in ticket creation conversation mode
      if (ticketCreation.active) {
        await handleTicketCreationStep(userMessage);
        return;
      }

      // Normal FAQ/general response flow
      const botResponse = await fetchOpenRouterResponse(userMessage);
      const responseText = typeof botResponse === 'string' ? botResponse : botResponse.text;
      const matchedQuestion = typeof botResponse === 'object' ? botResponse.matchedQuestion : null;
      
      console.log(`💡 Generating suggestions for matched question: "${matchedQuestion || 'none'}"`);
      const suggestions = getContextualSuggestions(matchedQuestion);
      
      setMessages((prev) => [
        ...prev,
        {
          text: responseText,
          sender: "bot",
          time: new Date(),
          suggestions,
        },
      ]);
    } catch (error) {
      console.error('Error getting bot response:', error);
      setMessages((prev) => [
        ...prev,
        {
          text: "Sorry, I encountered an error. Please try again.",
          sender: "bot",
          time: new Date(),
          suggestions: getDefaultSuggestions(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle ticket creation conversation flow
  const handleTicketCreationStep = async (userInput) => {
    const step = ticketCreation.step;
    let botMessage = '';
    let nextStep = null;
    let suggestions = [];
    const updatedData = { ...ticketCreation.data };

    switch (step) {
      case 'subject':
        updatedData.subject = userInput;
        botMessage = `Great! Your ticket subject is: "${userInput}"\n\nNow, please select a category for your ticket:`;
        nextStep = 'category';
        suggestions = TICKET_CATEGORIES.map(cat => ({ label: cat, type: 'ticket-category', value: cat }));
        break;

      case 'category':
        // Validate category
        const normalizedCategory = TICKET_CATEGORIES.find(cat => cat.toLowerCase() === userInput.toLowerCase());
        if (!normalizedCategory) {
          botMessage = `Sorry, "${userInput}" is not a valid category. Please select one of the following:`;
          suggestions = TICKET_CATEGORIES.map(cat => ({ label: cat, type: 'ticket-category', value: cat }));
          nextStep = 'category'; // Stay on same step
          break;
        }
        
        updatedData.category = normalizedCategory;
        
        // Route to appropriate next step based on category
        if (normalizedCategory === 'IT Support') {
          botMessage = `Perfect! You selected "${normalizedCategory}".\n\nPlease choose a sub-category:`;
          nextStep = 'subcategory';
          suggestions = IT_SUPPORT_SUBCATEGORIES.map(sub => ({ label: sub, type: 'ticket-subcategory', value: sub }));
        } else if (normalizedCategory === 'Asset Check Out') {
          botMessage = `You selected "${normalizedCategory}".\n\nWhat type of asset do you need to check out?`;
          nextStep = 'asset_subcategory';
          suggestions = ASSET_SUBCATEGORIES.map(sub => ({ label: sub, type: 'ticket-subcategory', value: sub }));
        } else if (normalizedCategory === 'Asset Check In') {
          botMessage = `You selected "${normalizedCategory}".\n\nWhat type of asset are you returning?`;
          nextStep = 'asset_subcategory';
          suggestions = ASSET_SUBCATEGORIES.map(sub => ({ label: sub, type: 'ticket-subcategory', value: sub }));
        } else if (normalizedCategory === 'Others') {
          botMessage = `You selected "${normalizedCategory}".\n\nPlease provide a detailed description of your request:`;
          nextStep = 'description';
        } else {
          // New Budget Proposal or other categories
          botMessage = `You selected "${normalizedCategory}".\n\nPlease provide details about your request:`;
          nextStep = 'description';
        }
        break;

      case 'subcategory':
        const normalizedSubcategory = IT_SUPPORT_SUBCATEGORIES.find(sub => sub.toLowerCase() === userInput.toLowerCase());
        if (!normalizedSubcategory) {
          botMessage = `Sorry, "${userInput}" is not a valid sub-category. Please select one of the following:`;
          suggestions = IT_SUPPORT_SUBCATEGORIES.map(sub => ({ label: sub, type: 'ticket-subcategory', value: sub }));
          nextStep = 'subcategory';
          break;
        }
        
        updatedData.subCategory = normalizedSubcategory;
        botMessage = `Got it! Sub-category: "${normalizedSubcategory}".\n\nWhat type of device is affected?`;
        nextStep = 'device_type';
        suggestions = DEVICE_TYPES.map(type => ({ label: type, type: 'ticket-device', value: type }));
        break;

      case 'device_type':
        const normalizedDevice = DEVICE_TYPES.find(dev => dev.toLowerCase() === userInput.toLowerCase());
        if (!normalizedDevice) {
          botMessage = `Sorry, "${userInput}" is not a valid device type. Please select one:`;
          suggestions = DEVICE_TYPES.map(type => ({ label: type, type: 'ticket-device', value: type }));
          nextStep = 'device_type';
          break;
        }
        
        updatedData.deviceType = normalizedDevice;
        
        if (normalizedDevice === 'Other') {
          botMessage = `Please specify what device type:`;
          nextStep = 'custom_device';
        } else {
          botMessage = `Device type: "${normalizedDevice}".\n\nPlease provide a detailed description of the issue:`;
          nextStep = 'description';
        }
        break;

      case 'custom_device':
        updatedData.customDeviceType = userInput;
        botMessage = `Thanks! Custom device: "${userInput}".\n\nNow, please provide a detailed description of the issue:`;
        nextStep = 'description';
        break;

      case 'asset_subcategory':
        const normalizedAssetSub = ASSET_SUBCATEGORIES.find(sub => sub.toLowerCase() === userInput.toLowerCase());
        if (!normalizedAssetSub) {
          botMessage = `Sorry, "${userInput}" is not a valid asset type. Please select one:`;
          suggestions = ASSET_SUBCATEGORIES.map(sub => ({ label: sub, type: 'ticket-subcategory', value: sub }));
          nextStep = 'asset_subcategory';
          break;
        }
        
        updatedData.subCategory = normalizedAssetSub;
        
        // Show available assets for this subcategory
        const availableAssets = MOCK_ASSETS[normalizedAssetSub] || [];
        if (availableAssets.length === 0) {
          botMessage = `No assets available for "${normalizedAssetSub}". Please contact support.`;
          nextStep = null;
          setTicketCreation({ active: false, step: null, data: {} });
          suggestions = getDefaultSuggestions();
          break;
        }
        
        botMessage = `Great! Please select which ${normalizedAssetSub} you need:`;
        nextStep = 'asset_name';
        suggestions = availableAssets.map(asset => ({ 
          label: asset.name, 
          type: 'ticket-asset', 
          value: asset.name 
        }));
        break;

      case 'asset_name':
        // Find the selected asset to get its serial number
        const selectedAsset = MOCK_ASSETS[updatedData.subCategory]?.find(
          asset => asset.name.toLowerCase() === userInput.toLowerCase()
        );
        
        if (!selectedAsset) {
          botMessage = `Sorry, "${userInput}" is not available. Please select from the list:`;
          const availableAssets = MOCK_ASSETS[updatedData.subCategory] || [];
          suggestions = availableAssets.map(asset => ({ 
            label: asset.name, 
            type: 'ticket-asset', 
            value: asset.name 
          }));
          nextStep = 'asset_name';
          break;
        }
        
        updatedData.assetName = selectedAsset.name;
        updatedData.serialNumber = selectedAsset.serialNumber;
        
        botMessage = `Perfect! You selected:\n\n📦 Asset: ${selectedAsset.name}\n🔢 Serial Number: ${selectedAsset.serialNumber}\n\nNow, please select the location:`;
        nextStep = 'location';
        suggestions = LOCATIONS.map(loc => ({ label: loc, type: 'ticket-location', value: loc }));
        break;

      case 'location':
        const normalizedLocation = LOCATIONS.find(loc => loc.toLowerCase() === userInput.toLowerCase());
        if (!normalizedLocation) {
          botMessage = `Sorry, "${userInput}" is not a valid location. Please select one:`;
          suggestions = LOCATIONS.map(loc => ({ label: loc, type: 'ticket-location', value: loc }));
          nextStep = 'location';
          break;
        }
        
        updatedData.location = normalizedLocation;
        
        // Check if this is Asset Check In or Check Out
        if (updatedData.category === 'Asset Check Out') {
          botMessage = `Location: ${normalizedLocation}\n\nWhen do you expect to return this asset?`;
          nextStep = 'return_date';
        } else if (updatedData.category === 'Asset Check In') {
          botMessage = `Location: ${normalizedLocation}\n\nIs there any issue with the asset you're returning?`;
          nextStep = 'issue_type';
          suggestions = ASSET_ISSUE_TYPES.map(issue => ({ label: issue, type: 'ticket-issue', value: issue }));
        }
        break;

      case 'return_date':
        // Parse natural language date
        const parsedDate = parseNaturalDate(userInput);
        
        if (!parsedDate) {
          botMessage = `Sorry, I couldn't understand that date. Please try again.\n\nExamples: "tomorrow", "November 25", "Dec 15 2026", or "2025-12-31"`;
          nextStep = 'return_date';
          break;
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (parsedDate < today) {
          botMessage = `The return date cannot be in the past (today is ${today.toLocaleDateString()}). Please provide a future date:`;
          nextStep = 'return_date';
          break;
        }
        
        const formattedDate = parsedDate.toISOString().split('T')[0];
        updatedData.expectedReturnDate = formattedDate;
        botMessage = `Expected return date: ${parsedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\nPlease provide a description or additional notes for this ticket:`;
        nextStep = 'description';
        break;

      case 'issue_type':
        const normalizedIssue = ASSET_ISSUE_TYPES.find(issue => issue.toLowerCase() === userInput.toLowerCase());
        if (!normalizedIssue) {
          botMessage = `Sorry, "${userInput}" is not a valid issue type. Please select one:`;
          suggestions = ASSET_ISSUE_TYPES.map(issue => ({ label: issue, type: 'ticket-issue', value: issue }));
          nextStep = 'issue_type';
          break;
        }
        
        updatedData.issueType = normalizedIssue;
        
        if (normalizedIssue === 'Other') {
          botMessage = `Please describe the issue in detail:`;
          nextStep = 'other_issue';
        } else {
          botMessage = `Issue type: ${normalizedIssue}\n\nPlease provide any additional details:`;
          nextStep = 'description';
        }
        break;

      case 'other_issue':
        updatedData.otherIssue = userInput;
        botMessage = `Thank you. Please provide any additional details:`;
        nextStep = 'description';
        break;

      case 'description':
        // Validate description is not empty and not placeholder text
        const trimmedInput = userInput.trim();
        const invalidDescriptions = ['none', 'n/a', 'na', 'skip', 'no', 'nothing', '-'];
        
        if (!trimmedInput || invalidDescriptions.includes(trimmedInput.toLowerCase())) {
          botMessage = `Description is required and cannot be empty. Please provide a meaningful description for this ticket:`;
          nextStep = 'description';
          break;
        }
        
        updatedData.description = trimmedInput;
        
        // Build summary based on category
        let summary = `Perfect! I have all the information needed.\n\n📋 Ticket Summary:\n\n`;
        summary += `Subject: ${updatedData.subject}\n`;
        summary += `Category: ${updatedData.category}\n`;
        
        if (updatedData.subCategory) {
          summary += `Sub-category: ${updatedData.subCategory}\n`;
        }
        
        if (updatedData.assetName) {
          summary += `Asset: ${updatedData.assetName}\n`;
          summary += `Serial Number: ${updatedData.serialNumber}\n`;
        }
        
        if (updatedData.location) {
          summary += `Location: ${updatedData.location}\n`;
        }
        
        if (updatedData.expectedReturnDate) {
          const returnDate = new Date(updatedData.expectedReturnDate);
          summary += `Expected Return: ${returnDate.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}\n`;
        }
        
        if (updatedData.issueType) {
          summary += `Issue Type: ${updatedData.issueType}\n`;
        }
        
        if (updatedData.otherIssue) {
          summary += `Issue Details: ${updatedData.otherIssue}\n`;
        }
        
        if (updatedData.deviceType) {
          summary += `Device: ${updatedData.customDeviceType || updatedData.deviceType}\n`;
        }
        
        summary += `Description: ${updatedData.description}\n\n`;
        
        // Ask about schedule request
        botMessage = `${summary}\nWould you like to submit this ticket now or schedule it for later?`;
        nextStep = 'schedule_request';
        suggestions = [
          { label: 'Submit Now', type: 'ticket-schedule', value: 'now' },
          { label: 'Schedule for Later', type: 'ticket-schedule', value: 'later' }
        ];
        break;

      case 'schedule_request':
        if (userInput.toLowerCase().includes('now') || userInput.toLowerCase() === 'submit now') {
          updatedData.scheduledRequest = null;
          botMessage = `Great! Your ticket will be submitted immediately.\n\nDo you have any attachments (pictures, documents) you'd like to add?\n\n📎 Allowed: PNG, JPG, PDF, Word, Excel, CSV (max 10MB each)`;
          nextStep = 'attachments_prompt';
          suggestions = [
            { label: 'Yes, Add Attachments', type: 'ticket-attachment-prompt', value: 'yes' },
            { label: 'No Attachments', type: 'ticket-attachment-prompt', value: 'no' }
          ];
        } else if (userInput.toLowerCase().includes('later') || userInput.toLowerCase().includes('schedule')) {
          botMessage = `When would you like this ticket to be processed?`;
          nextStep = 'schedule_date';
        } else {
          botMessage = `Please choose whether to submit now or schedule for later:`;
          nextStep = 'schedule_request';
          suggestions = [
            { label: 'Submit Now', type: 'ticket-schedule', value: 'now' },
            { label: 'Schedule for Later', type: 'ticket-schedule', value: 'later' }
          ];
        }
        break;

      case 'schedule_date':
        const scheduledDate = parseNaturalDate(userInput);
        
        if (!scheduledDate) {
          botMessage = `Sorry, I couldn't understand that date. Please try again.\n\nExamples: "tomorrow", "December 15", "next week", or "2025-12-31"`;
          nextStep = 'schedule_date';
          break;
        }
        
        const todayForSchedule = new Date();
        todayForSchedule.setHours(0, 0, 0, 0);
        
        if (scheduledDate < todayForSchedule) {
          botMessage = `The scheduled date cannot be in the past. Please provide a future date:`;
          nextStep = 'schedule_date';
          break;
        }
        
        const formattedScheduleDate = scheduledDate.toISOString().split('T')[0];
        updatedData.scheduledRequest = formattedScheduleDate;
        botMessage = `Perfect! This ticket will be scheduled for ${scheduledDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.\n\nDo you have any attachments (pictures, documents) you'd like to add?\n\n📎 Allowed: PNG, JPG, PDF, Word, Excel, CSV (max 10MB each)`;
        nextStep = 'attachments_prompt';
        suggestions = [
          { label: 'Yes, Add Attachments', type: 'ticket-attachment-prompt', value: 'yes' },
          { label: 'No Attachments', type: 'ticket-attachment-prompt', value: 'no' }
        ];
        break;

      case 'attachments_prompt':
        if (userInput.toLowerCase().includes('yes')) {
          botMessage = `Please upload your file.\n\nClick the 📎 icon below to select a file.\n\n✅ Allowed: PNG, JPG, PDF, Word, Excel, CSV\n📏 Max size: 10MB per file`;
          nextStep = 'waiting_for_attachment';
        } else {
          botMessage = `No attachments added.\n\nReady to submit your ticket?`;
          nextStep = 'confirm';
          suggestions = [
            { label: 'Yes, Submit Ticket', type: 'ticket-confirm', value: 'yes' },
            { label: 'Cancel', type: 'ticket-confirm', value: 'no' }
          ];
        }
        break;

      case 'attachments_more':
        if (userInput.toLowerCase().includes('yes') || userInput.toLowerCase().includes('another')) {
          botMessage = `Please upload another file.\n\nClick the 📎 icon below.`;
          nextStep = 'waiting_for_attachment';
        } else {
          const attachmentCount = ticketCreation.attachments?.length || 0;
          botMessage = `Great! You've added ${attachmentCount} attachment(s).\n\nReady to submit your ticket?`;
          nextStep = 'confirm';
          suggestions = [
            { label: 'Yes, Submit Ticket', type: 'ticket-confirm', value: 'yes' },
            { label: 'Cancel', type: 'ticket-confirm', value: 'no' }
          ];
        }
        break;

      case 'confirm':
        if (userInput.toLowerCase().includes('yes') || userInput.toLowerCase() === 'y') {
          // Submit the ticket
          await submitTicketFromChat(updatedData, ticketCreation.attachments);
          return; // submitTicketFromChat handles the response
        } else {
          botMessage = `No problem! Ticket creation cancelled. How else can I help you?`;
          setTicketCreation({ active: false, step: null, data: {}, attachments: [] });
          suggestions = getDefaultSuggestions();
          nextStep = null;
        }
        break;

      default:
        botMessage = "Something went wrong. Let's start over. How can I help you?";
        setTicketCreation({ active: false, step: null, data: {} });
        suggestions = getDefaultSuggestions();
    }

    // Update ticket creation state
    setTicketCreation((prev) => ({
      active: nextStep !== null,
      step: nextStep,
      data: updatedData,
      attachments: prev.attachments || [],
    }));

    // Add bot response
    setMessages((prev) => [
      ...prev,
      {
        text: botMessage,
        sender: "bot",
        time: new Date(),
        suggestions,
      },
    ]);
    setIsTyping(false);
  };

  // Submit ticket from chat conversation
  const submitTicketFromChat = async (ticketData, attachments = []) => {
    try {
      const { backendTicketService } = await import('../../../../services/backend/ticketService');
      
      const payload = {
        subject: ticketData.subject,
        category: ticketData.category,
        description: ticketData.description,
      };
      
      // Build dynamic_data object for category-specific fields
      const dynamicData = {};
      
      // Add scheduled request to dynamic_data if provided
      if (ticketData.scheduledRequest) {
        dynamicData.scheduleRequest = {
          date: ticketData.scheduledRequest,
          time: '',
          notes: ''
        };
      }
      
      // Add category-specific fields to dynamic_data
      if (ticketData.subCategory) {
        payload.sub_category = ticketData.subCategory;
      }
      
      if (ticketData.assetName) {
        dynamicData.assetName = ticketData.assetName;
      }
      
      if (ticketData.serialNumber) {
        dynamicData.serialNumber = ticketData.serialNumber;
      }
      
      if (ticketData.location) {
        dynamicData.location = ticketData.location;
      }
      
      if (ticketData.expectedReturnDate) {
        dynamicData.expectedReturnDate = ticketData.expectedReturnDate;
      }
      
      if (ticketData.issueType) {
        dynamicData.issueType = ticketData.issueType;
      }
      
      if (ticketData.otherIssue) {
        dynamicData.otherIssue = ticketData.otherIssue;
      }
      
      if (ticketData.deviceType) {
        dynamicData.deviceType = ticketData.customDeviceType || ticketData.deviceType;
      }
      
      if (ticketData.softwareAffected) {
        dynamicData.softwareAffected = ticketData.softwareAffected;
      }

      console.log('Submitting ticket from chatbot:', payload);
      console.log('Dynamic data:', dynamicData);
      console.log('Attachments:', attachments);
      
      // Create FormData (always use FormData to support both files and dynamic_data)
      const formData = new FormData();
      
      // Add basic payload fields
      formData.append('subject', payload.subject);
      formData.append('category', payload.category);
      formData.append('sub_category', payload.sub_category || '');
      formData.append('description', payload.description);
      
      // Add dynamic_data as JSON string
      if (Object.keys(dynamicData).length > 0) {
        formData.append('dynamic_data', JSON.stringify(dynamicData));
      }
      
      // Add attachments with the correct key
      if (attachments && attachments.length > 0) {
        attachments.forEach((file) => {
          formData.append('files[]', file);
        });
      }
      
      const response = await backendTicketService.createTicket(formData);
      
      const ticketNumber = response.ticket_number || response.id;
      const successMessage = `✅ Your ticket has been submitted successfully!\n\nTicket Number: ${ticketNumber}\n\nYou can track this ticket and all your other tickets in the "My Tickets" section.`;
      
      setMessages((prev) => [
        ...prev,
        {
          text: successMessage,
          sender: "bot",
          time: new Date(),
          suggestions: [
            { label: 'View Requested Ticket', type: 'redirect', route: `/employee/ticket-tracker/${ticketNumber}` },
            { label: 'Submit Another Ticket', type: 'start-ticket', value: 'new' },
            { label: 'Browse FAQs', type: 'redirect', route: '/employee/frequently-asked-questions' }
          ],
        },
      ]);
      
      // Reset ticket creation state
      setTicketCreation({ active: false, step: null, data: {}, attachments: [] });
    } catch (error) {
      console.error('Error submitting ticket from chat:', error);
      setMessages((prev) => [
        ...prev,
        {
          text: `❌ Sorry, there was an error submitting your ticket: ${error.message}\n\nPlease try again or use the ticket submission form.`,
          sender: "bot",
          time: new Date(),
          suggestions: [
            { label: 'Try Again', type: 'start-ticket', value: 'retry' },
            { label: 'Open Ticket Form', type: 'redirect', route: '/employee/submit-ticket' },
            { label: 'Get Help', type: 'redirect', route: '/employee/frequently-asked-questions' }
          ],
        },
      ]);
      setTicketCreation({ active: false, step: null, data: {}, attachments: [] });
    } finally {
      setIsTyping(false);
    }
  };

  // Start ticket creation conversation
  const startTicketCreation = () => {
    setTicketCreation({
      active: true,
      step: 'subject',
      data: {},
    });
    
    setMessages((prev) => [
      ...prev,
      {
        text: "Let's create a ticket together! 🎫\n\nFirst, what would you like the subject of your ticket to be?\n\n(Please provide a brief, clear subject line)",
        sender: "bot",
        time: new Date(),
        suggestions: [
          { label: 'Cancel', type: 'cancel-ticket', value: 'cancel' }
        ],
      },
    ]);
  };

  const getDefaultSuggestions = () => [
    { label: 'Browse FAQs', type: 'redirect', route: '/employee/frequently-asked-questions' },
    { label: 'Submit a Ticket', type: 'start-ticket', value: 'new' },
    { label: 'View My Tickets', type: 'redirect', route: '/employee/active-tickets/all-active-tickets' }
  ];

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check if we're in attachment waiting mode
    if (ticketCreation.active && ticketCreation.step === 'waiting_for_attachment') {
      // Validate file type
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (!ALLOWED_FILE_TYPES.includes(file.type) && !ALLOWED_FILE_EXTENSIONS.includes(fileExtension)) {
        setMessages((prev) => [
          ...prev,
          {
            text: `❌ Invalid file type. Please upload only: PNG, JPG, PDF, Word, Excel, or CSV files.`,
            sender: "bot",
            time: new Date(),
          },
        ]);
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setMessages((prev) => [
          ...prev,
          {
            text: `❌ File is too large. Maximum file size is 10MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`,
            sender: "bot",
            time: new Date(),
          },
        ]);
        return;
      }

      // Add file to attachments
      setTicketCreation((prev) => ({
        ...prev,
        attachments: [...prev.attachments, file],
      }));

      const userMessage = {
        text: `📎 Uploaded: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
        sender: "user",
        time: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Show bot response asking about more attachments
      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              text: `File uploaded successfully! Would you like to add another attachment?`,
              sender: "bot",
              time: new Date(),
              suggestions: [
                { label: 'Add Another File', type: 'ticket-attachment-more', value: 'yes' },
                { label: 'Done with Attachments', type: 'ticket-attachment-more', value: 'no' }
              ],
            },
          ]);
          setTicketCreation((prev) => ({
            ...prev,
            step: 'attachments_more',
          }));
          setIsTyping(false);
        }, 500);
      }, 100);
    } else {
      // Normal file upload (not in ticket creation flow)
      const userMessage = {
        text: `📎 You uploaded: ${file.name}`,
        sender: "user",
        time: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
    }

    // Clear file input
    e.target.value = '';
  };

  // Remove emoji from text for TTS
  const stripEmojis = (str) =>
    str.replace(/[\p{Emoji_Presentation}\p{Emoji}\u200d]+/gu, '').replace(/\s{2,}/g, ' ').trim();

  const speakText = (text) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        let toSpeak = Array.isArray(text) ? text.join('. ') : text;
        toSpeak = stripEmojis(toSpeak);
        // Replace all variants of PAXI with 'pak c' for TTS
        toSpeak = toSpeak.replace(/PAXI/gi, 'pak c');
        const utter = new SpeechSynthesisUtterance(toSpeak);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      } catch (e) {
        // ignore
      }
    }
  };

  const renderMessage = (msg, index) => {
    // Generate a real-time timestamp for each message
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return (
      <div key={index} className={styles['message-wrapper']}>
        <div
          className={`${styles.message} ${
            msg.sender === "user" ? styles["user-message"] : styles["bot-message"]
          }`}
          style={msg.sender === 'user' ? { color: '#fff' } : {}}
        >
          {msg.isList && msg.listItems ? (
            <>
              <p className={msg.sender === 'user' ? styles['user-message-text'] : ''}>{msg.text}</p>
              <ul className={styles.botFeaturesList}>
                {msg.listItems.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </>
          ) : (
            msg.text.split("\n").map((line, i) => (
              <p key={i} className={msg.sender === 'user' ? styles['user-message-text'] : ''}>{line}</p>
            ))
          )}
        </div>

        {/* Ellipsis and timestamp below the message bubble for both user and bot */}
        <div
          className={
            msg.sender === 'user'
              ? `${styles['message-actions-below']} ${styles['message-actions-below-user']}`
              : styles['message-actions-below']
          }
        >
          {msg.sender === 'bot' ? (
            <>
              <div className={styles['ellipsis-wrapper']}>
                <button
                  className={styles['ellipsis-btn']}
                  onClick={() => setMenuOpenIndex(menuOpenIndex === index ? null : index)}
                  aria-label="More"
                  title="More"
                >
                  <FiMoreHorizontal />
                </button>
                {menuOpenIndex === index && (
                  <div className={styles['ellipsis-menu']}>
                    <button
                      className={styles['ellipsis-menu-item']}
                      onClick={() => {
                        speakText(msg.isList && Array.isArray(msg.listItems) ? `${msg.text} ${msg.listItems.join('. ')}` : msg.text);
                        setMenuOpenIndex(null);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <FiVolume2 style={{ fontSize: 18 }} />
                      Read Aloud
                    </button>
                  </div>
                )}
              </div>
              <span className={styles['message-timestamp']}>{timeString}</span>
            </>
          ) : (
            <span className={styles['message-timestamp']}>{timeString}</span>
          )}
        </div>

        {/* Suggestion buttons outside the message bubble for bot messages */}
        {msg.sender === 'bot' && msg.suggestions && msg.suggestions.length > 0 && (
          <div className={styles['suggestions-row-outside-column']}>
            {msg.suggestions.map((sugg, i) => (
              <button
                key={i}
                className={styles['suggestion-btn-rect']}
                onClick={() => {
                  if (sugg.type === 'redirect') {
                    navigate(sugg.route);
                  } else if (sugg.type === 'prefill') {
                    const lastUserMsg = messages.filter(m => m.sender === 'user').slice(-1)[0];
                    const prefill = {
                      subject: lastUserMsg?.text?.slice(0, 60) || 'Support request',
                      description: lastUserMsg?.text || '',
                    };
                    navigate(sugg.route, { state: { prefill } });
                  } else if (sugg.type === 'start-ticket') {
                    startTicketCreation();
                  } else if (sugg.type === 'cancel-ticket') {
                    setTicketCreation({ active: false, step: null, data: {} });
                    setMessages((prev) => [
                      ...prev,
                      {
                        text: "Ticket creation cancelled. How else can I help you?",
                        sender: "bot",
                        time: new Date(),
                        suggestions: getDefaultSuggestions(),
                      },
                    ]);
                  } else if (sugg.type === 'ticket-category' || sugg.type === 'ticket-subcategory' || sugg.type === 'ticket-device' || sugg.type === 'ticket-confirm' || sugg.type === 'ticket-asset' || sugg.type === 'ticket-location' || sugg.type === 'ticket-issue' || sugg.type === 'ticket-description' || sugg.type === 'ticket-schedule' || sugg.type === 'ticket-attachment-prompt' || sugg.type === 'ticket-attachment-more') {
                    // Auto-send selection without populating input field
                    const userMsg = {
                      text: sugg.value,
                      sender: "user",
                      time: new Date(),
                    };
                    setMessages((prev) => [...prev, userMsg]);
                    setIsTyping(true);
                    handleTicketCreationStep(sugg.value);
                  }
                }}
              >
                {sugg.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles["chatbot-container"]}>
      <div className={styles["chat-window"]}>
        <div className={styles["chat-header"]}>
          <div className={styles["chat-header-logo"]}>
            <img src={MapLogo} alt="Map Logo" className={styles["map-logo"]} />
            <h3>PAXI</h3>
          </div>
          <button className={styles["close-btn"]} onClick={closeModal}>
            <FiX />
          </button>
        </div>

        <div className={styles["chat-messages"]} ref={chatMessagesRef}>
          {isTyping && (
            <div
              className={`${styles.message} ${styles["bot-message"]} ${styles["typing-indicator"]}`}
              aria-label="Bot is typing"
            >
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}
          {messages.slice().reverse().map(renderMessage)}
          <div ref={messagesEndRef} />
        </div>

        {showScrollButton && (
          <button 
            className={styles["scroll-to-bottom"]} 
            onClick={scrollToBottom}
            aria-label="Scroll to bottom"
          >
            <FiChevronDown />
          </button>
        )}

        <div className={styles["chat-input-container"]}>
          <div className={styles["chat-input-area"]}>
            <label className={styles["upload-btn"]}>
              <input type="file" onChange={handleFileUpload} hidden />
              <FiPaperclip className={styles["upload-icon"]} />
            </label>
            <input
              type="text"
              placeholder="What's your message?"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              ref={inputRef}
              autoComplete="off"
            />
            <button className={styles["send-btn"]} onClick={handleSend}>
              <FiSend size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeChatbot;