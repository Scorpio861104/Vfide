#!/bin/bash

# ============================================
# VFIDE Deployment Script
# ============================================
# 
# This script automates the deployment of VFIDE
# to production using Vercel.
#
# Usage: ./scripts/deploy.sh [environment]
#   environment: staging | production (default: staging)
#
# Prerequisites:
#   - Vercel CLI installed (npm install -g vercel)
#   - Logged into Vercel (vercel login)
#   - Environment variables configured in Vercel
#
# ============================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-staging}"
PROJECT_NAME="vfide"

# Functions
log_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

print_banner() {
    echo ""
    echo "================================================"
    echo "  🚀 VFIDE Deployment Script"
    echo "  Environment: $ENVIRONMENT"
    echo "================================================"
    echo ""
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        log_error "Vercel CLI not found. Please install it:"
        echo "  npm install -g vercel"
        exit 1
    fi
    log_success "Vercel CLI found"
    
    # Check if logged into Vercel
    if ! vercel whoami &> /dev/null; then
        log_error "Not logged into Vercel. Please login:"
        echo "  vercel login"
        exit 1
    fi
    log_success "Logged into Vercel as: $(vercel whoami)"
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js not found. Please install Node.js 18+"
        exit 1
    fi
    NODE_VERSION=$(node -v)
    log_success "Node.js version: $NODE_VERSION"
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        log_error "npm not found. Please install npm"
        exit 1
    fi
    NPM_VERSION=$(npm -v)
    log_success "npm version: $NPM_VERSION"
}

run_pre_deployment_checks() {
    log_info "Running pre-deployment checks..."
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies..."
        npm install
        log_success "Dependencies installed"
    fi
    
    # Run TypeScript check
    log_info "Running TypeScript check..."
    if npm run typecheck; then
        log_success "TypeScript check passed"
    else
        log_error "TypeScript check failed"
        exit 1
    fi
    
    # Run linter
    log_info "Running linter..."
    if npm run lint; then
        log_success "Linting passed"
    else
        log_warning "Linting issues found (continuing anyway)"
    fi
    
    # Build test
    log_info "Testing production build..."
    if npm run build; then
        log_success "Production build successful"
    else
        log_error "Production build failed"
        exit 1
    fi
}

deploy_to_vercel() {
    log_info "Deploying to Vercel ($ENVIRONMENT)..."
    
    if [ "$ENVIRONMENT" = "production" ]; then
        log_warning "Deploying to PRODUCTION environment"
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled"
            exit 0
        fi
        
        # Deploy to production
        vercel --prod
    else
        # Deploy to preview/staging
        vercel
    fi
    
    if [ $? -eq 0 ]; then
        log_success "Deployment successful!"
    else
        log_error "Deployment failed"
        exit 1
    fi
}

post_deployment_checks() {
    log_info "Running post-deployment checks..."
    
    # Get deployment URL
    DEPLOYMENT_URL=$(vercel ls | grep "vfide" | head -1 | awk '{print $2}')
    
    if [ -z "$DEPLOYMENT_URL" ]; then
        log_warning "Could not determine deployment URL"
        return
    fi
    
    log_info "Deployment URL: https://$DEPLOYMENT_URL"
    
    # Wait for deployment to be ready
    log_info "Waiting for deployment to be ready..."
    sleep 10
    
    # Check health endpoint
    log_info "Checking health endpoint..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DEPLOYMENT_URL/api/health" || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        log_success "Health check passed (HTTP $HTTP_CODE)"
    else
        log_warning "Health check returned HTTP $HTTP_CODE"
    fi
    
    # Check homepage
    log_info "Checking homepage..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DEPLOYMENT_URL/" || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        log_success "Homepage is accessible (HTTP $HTTP_CODE)"
    else
        log_warning "Homepage returned HTTP $HTTP_CODE"
    fi
}

print_summary() {
    echo ""
    echo "================================================"
    echo "  Deployment Summary"
    echo "================================================"
    echo ""
    echo "Environment: $ENVIRONMENT"
    echo "Status: ✓ Deployed successfully"
    echo ""
    echo "Next steps:"
    echo "  1. Visit your deployment URL to verify"
    echo "  2. Test critical user flows"
    echo "  3. Monitor Sentry for errors"
    echo "  4. Check Vercel logs for issues"
    echo ""
    echo "Useful commands:"
    echo "  vercel logs             # View logs"
    echo "  vercel ls               # List deployments"
    echo "  vercel rollback [url]   # Rollback if needed"
    echo ""
    echo "================================================"
    echo ""
}

# Main execution
main() {
    print_banner
    check_prerequisites
    run_pre_deployment_checks
    deploy_to_vercel
    post_deployment_checks
    print_summary
}

# Run main function
main
