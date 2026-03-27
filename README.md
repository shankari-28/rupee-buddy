# My Rupee Buddy - AI-Powered Personal Finance Assistant

An intelligent expense tracking app for students and early professionals with an **AI-powered financial advisor** that generates personalized, data-driven financial advice.

## Features

### Core Functionality
- 📊 **Expense Tracking**: Log and categorize daily expenses (Food, Transport, Others)
- 💳 **Smart Organization**: View expenses by date, category, and merchant
- 📈 **Visual Analytics**: Charts and statistics to understand spending patterns
- 📱 **Mobile-First Design**: Beautiful, responsive interface built with shadcn/ui
- 🔐 **Secure Authentication**: Built on Supabase for reliable data management

### 🤖 AI-Powered Financial Advisor
- **Intelligent Analysis**: Analyzes spending patterns and identifies inefficiencies
- **Spender Classification**: Categorizes you as Smart Saver, Moderate Spender, or High Spender
- **Risk Assessment**: Evaluates financial risk based on savings and spending ratios
- **Actionable Advice**: Provides 5-7 specific, practical recommendations
- **Savings Estimation**: Calculates realistic monthly savings potential with optimization strategies
- **Budget Insights**: Compares your spending against the 50-30-20 budgeting rule
- **AI Enhancement**: Optional integration with Hugging Face Inference API for contextual suggestions

See [FINANCIAL_ADVISOR_GUIDE.md](FINANCIAL_ADVISOR_GUIDE.md) for detailed information.

## Getting Started

### Prerequisites
- Node.js & npm (or bun) - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- A Supabase account (for backend services)
- (Optional) Hugging Face API token for AI-enhanced advice

### Installation

## What technologies are used for this project?

This project is built with:

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **State Management**: TanStack React Query
- **AI Integration**: Hugging Face Inference API
- **Testing**: Vitest + Testing Library

## Project Structure

```
src/
├── components/          # Reusable React components
│   ├── ui/             # shadcn/ui components
│   ├── BottomNav.tsx   # Navigation bar
│   ├── FinancialAdvisor.tsx  # AI advisor display component
│   └── ...
├── pages/              # Page components
│   ├── Index.tsx       # Home/dashboard
│   ├── Add.tsx         # Add expense
│   ├── History.tsx     # Expense history
│   ├── Advisor.tsx     # AI Financial Advisor
│   ├── Profile.tsx     # User profile
│   └── Auth.tsx        # Authentication
├── hooks/              # Custom React hooks
│   ├── useAuth.tsx     # Authentication management
│   ├── useExpenses.tsx # Expense data fetching
│   └── useFinancialAdvisor.tsx  # Financial advice generation
├── lib/                # Utilities and helpers
│   ├── huggingface-advisor.ts   # AI advisor logic
│   └── utils.ts        # Common utilities
└── integrations/
    └── supabase/       # Supabase configuration
```

## Setup Instructions

Follow these steps to set up the project locally:

```sh
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory
cd my-rupee-buddy

# Step 3: Install dependencies
npm install

# Step 4: Create a .env file with Supabase credentials
# Copy the example from .env and add your Supabase credentials:
# VITE_SUPABASE_URL=your_url
# VITE_SUPABASE_PUBLISHABLE_KEY=your_key
# VITE_HF_API_TOKEN=your_hf_token (optional)

# Step 5: Start the development server
npm run dev

# The app will be available at http://localhost:5173
```

## Setting Up the Financial Advisor

### Option 1: Use Built-in Advisor (No Setup Required)
The financial advisor works out of the box with pre-configured financial rules and analysis.

### Option 2: Enable AI-Enhanced Advice (Recommended)

1. Get a free Hugging Face API token:
   - Visit https://huggingface.co/settings/tokens
   - Create a new read-only token

2. Add to your `.env` file:
   ```
   VITE_HF_API_TOKEN="your_huggingface_token_here"
   ```

3. Restart the development server to apply changes

See [FINANCIAL_ADVISOR_GUIDE.md](FINANCIAL_ADVISOR_GUIDE.md) for complete documentation on the Financial Advisor feature.

## Available Scripts

```bash
npm run dev          # Start development server (Vite)
npm run build        # Build for production
npm run build:dev    # Build in development mode
npm run preview      # Preview production build locally
npm run lint         # Run ESLint
npm test             # Run tests once
npm run test:watch   # Run tests in watch mode
```

## Usage Guide

### 1. Adding Expenses
- Click the **Add** button in the bottom navigation
- Fill in amount, category, merchant, and date
- Save to track immediately

### 2. Viewing Expense History
- Click **History** to see all recorded expenses
- Filter by month, category, or date range
- Export as CSV for external analysis

### 3. Using the AI Financial Advisor
- Click **Advisor** in the bottom navigation
- Set your monthly income (click settings icon)
- View personalized financial advice based on your spending
- Navigate between months to track progress
- Implement suggestions and monitor improvements

### 4. Profile Management
- View overall statistics
- Export expense data
- Sign out securely

## Deployment

### Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

### Deploy to Netlify

```bash
# Create production build
npm run build

# Deploy the dist/ folder to Netlify
```

### Troubleshooting

### Issue: "Cannot find module" errors
**Solution**: Run `npm install` to ensure all dependencies are installed.

### Issue: Expenses not loading
**Solution**: Check your Supabase connection in `.env` files. Verify credentials and network connectivity.

### Issue: Financial Advisor shows no data
**Solution**: Log at least one expense in the current month, then navigate to the Advisor page.

### Issue: AI suggestions not appearing
**Solution**: This is normal if you haven't added a Hugging Face API token. The advisor will still provide excellent rule-based advice.

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Safari iOS 14+

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Privacy & Security

- ✅ All expense data is encrypted in transit (HTTPS)
- ✅ Financial analysis happens locally in your browser
- ✅ Supabase handles all authentication securely
- ✅ No personal data is shared with third parties (except Hugging Face if AI token is used)
- ✅ No tracking or analytics cookies (except Supabase session management)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or suggestions:
1. Check the [FINANCIAL_ADVISOR_GUIDE.md](FINANCIAL_ADVISOR_GUIDE.md) for detailed feature documentation
2. Check existing GitHub issues
3. Create a new issue with detailed steps to reproduce

## Roadmap

### Planned Features
- [ ] Recurring expense templates
- [ ] Budget goal tracking
- [ ] Monthly spending notifications
- [ ] Dark mode support
- [ ] Multi-language support (Hindi, Tamil, etc.)
- [ ] Advanced investment recommendations
- [ ] Peer comparison anonymously
- [ ] Receipt image scanning with OCR
- [ ] Bank account integration
- [ ] Advice export as PDF

### In Development
- [ ] User profile savings goals
- [ ] Monthly advice history archival

## Credits

Built with ❤️ using:
- [Supabase](https://supabase.com) - Backend
- [Hugging Face](https://huggingface.co) - AI Models
- [shadcn/ui](https://ui.shadcn.com) - Components
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [React Query](https://tanstack.com/query/latest) - Data Fetching
- [Vite](https://vitejs.dev) - Build Tool

## Changelog

### Version 1.1.0 (Current)
- ✨ **NEW**: AI-Powered Financial Advisor with Hugging Face Integration
- ✨ **NEW**: Monthly income configuration
- ✨ **NEW**: Risk assessment and spender classification
- ✨ **NEW**: Actionable financial recommendations
- 🎨 Updated navigation with Advisor link

### Version 1.0.0
- Initial release with expense tracking
- Category-wise analytics
- Expense history and filtering
- User authentication with Supabase

---

**Happy budgeting! Build better financial habits with My Rupee Buddy.** 💰📊✨
