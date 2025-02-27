# OwnChain

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200">
 <!-- Define gradients -->
 <defs>
 <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
 <stop offset="0%" stop-color="#3A0CA3" />
 <stop offset="100%" stop-color="#4361EE" />
 </linearGradient>
 <linearGradient id="gradient2" x1="0%" y1="100%" x2="100%" y2="0%">
 <stop offset="0%" stop-color="#4361EE" />
 <stop offset="100%" stop-color="#4CC9F0" />
 </linearGradient>
 </defs>
 <!-- Transparent background -->
 <rect width="600" height="200" fill="white" opacity="0"/>
 <!-- Overall layout adjustment -->
 <g transform="translate(120, 100)">
 <!-- Icon part - Adjust size -->
 <g transform="scale(0.7)">
 <!-- Circular background element -->
 <circle cx="0" cy="0" r="90" fill="url(#gradient1)" opacity="0.1"/>
 <!-- Main chain symbol -->
 <g transform="rotate(-30)">
 <!-- First chain link -->
 <path d="M-40,-30 A30,30 0 0,0 -40,30 A30,30 0 0,0 20,30 A30,30 0 0,0 20,-30 A30,30 0 0,0 -40,-30 Z"
 fill="url(#gradient1)"/>
 <path d="M-30,-15 A15,15 0 0,0 -30,15 A15,15 0 0,0 10,15 A15,15 0 0,0 10,-15 A15,15 0 0,0 -30,-15 Z"
 fill="white"/>
 <!-- Second chain link -->
 <path d="M20,-30 A30,30 0 0,0 20,30 A30,30 0 0,0 80,30 A30,30 0 0,0 80,-30 A30,30 0 0,0 20,-30 Z"
 fill="url(#gradient2)"/>
 <path d="M30,-15 A15,15 0 0,0 30,15 A15,15 0 0,0 70,15 A15,15 0 0,0 70,-15 A15,15 0 0,0 30,-15 Z"
 fill="white"/>
 </g>
 </g>
 <!-- Text part - Adjust size and position -->
 <g transform="translate(110, 0)">
 <text x="0" y="8" font-family="Montserrat, Arial, sans-serif" font-weight="700" font-size="48" text-anchor="start" alignment-baseline="middle">
 <tspan fill="#3A0CA3">Own</tspan><tspan fill="#4CC9F0">Chain</tspan>
 </text>
 </g>
 </g>
</svg>

> Creation is Asset, Social is Ownable

OwnChain is a revolutionary social media token layer protocol designed to add ownership, value capture, and cross-platform interoperability layers to existing social media platforms through blockchain technology. We are not creating another social media platform, but building the underlying value infrastructure for all existing and future social media.

## Project Vision and Mission

**Vision**: Redefine the economic model of social media, allowing creators and users to truly own and benefit from their content and data.

**Mission**:
- Provide a unified tokenization layer for social media platforms
- Enable cross-platform content value capture for creators
- Empower users with ownership and control over their personal data
- Create a more fair and transparent social media economic system

## Project Structure

```
contracts/          # Smart contract code
├── token/          # Token-related contracts
├── content/        # Content ownership and verification contracts
docs/               # Documentation
├── api/            # API documentation
scripts/            # Deployment and testing scripts
test/               # Test code
```

## Development Environment Setup

### Prerequisites

- Node.js >= 14.0.0
- npm >= 6.0.0
- Hardhat

### Installation

```bash
npm install
```

### Compile Contracts

```bash
npx hardhat compile
```

### Run Tests

```bash
npx hardhat test
```

## License

MIT 