# Rancher Hub - Tech Stack

## Frontend (apps/frontend)
- **Framework**: React 18.2.0 with TypeScript
- **Build Tool**: Vite 4.4.5
- **UI Framework**: Ant Design 5.7.0 + Tailwind CSS 3.3.3
- **State Management**: Zustand 4.3.9 + React Query (@tanstack/react-query 4.29.0)
- **Routing**: React Router DOM 6.14.0
- **HTTP Client**: Axios 1.4.0
- **Icons**: Ant Design Icons + Lucide React
- **Date/Time**: Day.js 1.11.13

## Backend (apps/backend)
- **Framework**: NestJS 10.0.0 with TypeScript
- **Database ORM**: TypeORM 0.3.17
- **Database**: SQLite 5.1.6 (dev) / PostgreSQL 8.11.0 (prod)
- **HTTP Client**: Axios 1.4.0
- **Kubernetes Client**: @kubernetes/client-node 1.3.0
- **Documentation**: Swagger 7.0.0
- **Scheduling**: @nestjs/schedule 6.0.0
- **Authentication**: bcryptjs 2.4.3
- **Validation**: class-validator 0.14.0 + class-transformer 0.5.1

## Development Tools
- **Package Manager**: npm (workspaces)
- **Linting**: ESLint + TypeScript ESLint
- **Formatting**: Prettier
- **Testing**: Jest
- **Node Version**: >= 18.0.0
- **npm Version**: >= 8.0.0

## Deployment
- **Containerization**: Docker (Dockerfile.backend, Dockerfile.frontend)
- **CI/CD**: GitHub Actions
- **Proxy Support**: socks-proxy-agent for network configurations