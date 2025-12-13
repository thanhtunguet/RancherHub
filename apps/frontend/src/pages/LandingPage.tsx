import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button, Card, Modal } from 'antd';
import { ServerIcon, GitCompareIcon, PackageIcon, FileTextIcon, ArrowRightIcon, CheckCircle2Icon } from 'lucide-react';
import { LoginForm } from '../components/auth/LoginForm';
import { BrowserFrame } from '../components/landing/BrowserFrame';
import {
  RancherClustersMockup,
  EnvironmentComparisonMockup,
  HarborRegistryMockup,
  ConfigMapSyncMockup,
} from '../components/landing/FeatureMockups';

export const LandingPage: React.FC = () => {
  const [showLogin, setShowLogin] = useState(false);
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    setShowLogin(false);
    navigate('/dashboard');
  };

  const siteTitle = 'Rancher Hub - Service Sync Manager for Kubernetes Clusters';
  const siteDescription = 'Streamline your Kubernetes operations with unified service management, environment comparison, and automated synchronization across multiple Rancher clusters.';
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://rancherhub.io';
  const siteImage = `${siteUrl}/og-image.png`;

  const features = [
    {
      icon: <ServerIcon className="w-12 h-12 text-blue-600" aria-hidden="true" />,
      title: 'Manage Rancher Clusters',
      description: 'Centralize management of multiple Rancher clusters and namespaces. Connect unlimited Rancher instances and seamlessly switch between environments.',
      mockup: <RancherClustersMockup />,
      reverse: false,
    },
    {
      icon: <GitCompareIcon className="w-12 h-12 text-blue-600" aria-hidden="true" />,
      title: 'Compare Environments',
      description: 'Side-by-side comparison of services and configurations across Dev, Staging, and Production environments. Identify differences instantly.',
      mockup: <EnvironmentComparisonMockup />,
      reverse: true,
    },
    {
      icon: <PackageIcon className="w-12 h-12 text-blue-600" aria-hidden="true" />,
      title: 'Harbor Registry Integration',
      description: 'Browse and select container images directly from Harbor registry. Update service versions with a single click. Track image sizes and storage usage.',
      mockup: <HarborRegistryMockup />,
      reverse: false,
    },
    {
      icon: <FileTextIcon className="w-12 h-12 text-blue-600" aria-hidden="true" />,
      title: 'ConfigMap Synchronization',
      description: 'Compare ConfigMaps between environments with key-by-key diff view. Sync selected configuration keys or batch update entire ConfigMaps.',
      mockup: <ConfigMapSyncMockup />,
      reverse: true,
    },
  ];

  const benefits = [
    'Multi-cluster Kubernetes management',
    'Real-time service synchronization',
    'Harbor registry browser',
    'Automated health monitoring',
    'Complete audit trail',
    'Telegram alerting',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Helmet>
        {/* Primary Meta Tags */}
        <title>{siteTitle}</title>
        <meta name="title" content={siteTitle} />
        <meta name="description" content={siteDescription} />
        <meta name="keywords" content="Rancher, Kubernetes, DevOps, Service Management, ConfigMap, Harbor, Container Registry, Multi-cluster, Environment Sync, K8s" />
        <meta name="author" content="Rancher Hub" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={siteUrl} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:title" content={siteTitle} />
        <meta property="og:description" content={siteDescription} />
        <meta property="og:image" content={siteImage} />
        <meta property="og:site_name" content="Rancher Hub" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={siteUrl} />
        <meta name="twitter:title" content={siteTitle} />
        <meta name="twitter:description" content={siteDescription} />
        <meta name="twitter:image" content={siteImage} />

        {/* Additional Meta Tags */}
        <meta name="theme-color" content="#2563EB" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Rancher Hub" />

        {/* Structured Data for SEO */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Rancher Hub",
            "applicationCategory": "DeveloperApplication",
            "description": siteDescription,
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "5",
              "ratingCount": "1"
            }
          })}
        </script>
      </Helmet>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Floating Navbar */}
        <nav className="fixed top-4 left-4 right-4 z-50 bg-white/80 backdrop-blur-md border border-gray-200 rounded-2xl shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ServerIcon size={32} className="text-blue-600" aria-hidden="true" />
                <h1 className="font-heading text-2xl font-bold text-gray-900">Rancher Hub</h1>
              </div>
              <Button
                type="primary"
                size="large"
                className="bg-orange-500 hover:bg-orange-600 border-0"
                onClick={() => setShowLogin(true)}
              >
                Sign In
              </Button>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="max-w-7xl mx-auto px-6 pt-32 pb-20">
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="font-heading text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Service Sync Manager for
              <span className="text-blue-600"> Rancher Clusters</span>
            </h2>
            <p className="font-body text-xl text-gray-600 mb-10 leading-relaxed">
              Streamline your Kubernetes operations with unified service management, environment comparison,
              and automated synchronization across multiple Rancher clusters.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button
                type="primary"
                size="large"
                className="bg-blue-600 hover:bg-blue-700 border-0 h-12 px-8 text-base"
                icon={<ArrowRightIcon size={18} />}
                iconPosition="end"
                onClick={() => setShowLogin(true)}
              >
                Get Started
              </Button>
              <Button
                size="large"
                className="h-12 px-8 text-base border-gray-300"
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Learn More
              </Button>
            </div>
          </div>

          {/* Benefits Grid */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-gray-700"
              >
                <CheckCircle2Icon size={20} className="text-green-500 flex-shrink-0" aria-hidden="true" />
                <span className="font-body text-sm">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-20">
          <h3 className="font-heading text-4xl font-bold text-gray-900 mb-4">
            Everything You Need to Manage Your Infrastructure
          </h3>
          <p className="font-body text-lg text-gray-600 max-w-2xl mx-auto">
            Powerful features designed to simplify DevOps workflows and accelerate deployments
          </p>
        </div>

        <div className="space-y-32">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`flex flex-col ${feature.reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 items-center`}
            >
              {/* Feature Description */}
              <div className="flex-1 space-y-6">
                <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center">
                  {feature.icon}
                </div>
                <h4 className="font-heading text-3xl font-bold text-gray-900">
                  {feature.title}
                </h4>
                <p className="font-body text-lg text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>

              {/* Feature Mockup */}
              <div className="flex-1 w-full">
                <BrowserFrame title={feature.title}>
                  {feature.mockup}
                </BrowserFrame>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <Card className="bg-gradient-to-r from-blue-600 to-blue-700 border-0 overflow-hidden">
          <div className="relative py-12 px-8 text-center">
            <h3 className="font-heading text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Streamline Your DevOps Workflow?
            </h3>
            <p className="font-body text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
              Join teams using Rancher Hub to manage their Kubernetes infrastructure efficiently
            </p>
            <Button
              type="primary"
              size="large"
              className="bg-orange-500 hover:bg-orange-600 border-0 h-12 px-10 text-base"
              icon={<ArrowRightIcon size={18} />}
              iconPosition="end"
              onClick={() => setShowLogin(true)}
            >
              Start Managing Your Clusters
            </Button>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-gray-200">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ServerIcon size={24} className="text-blue-600" aria-hidden="true" />
            <span className="font-heading text-gray-900 font-semibold">Rancher Hub</span>
          </div>
          <p className="font-body text-gray-600 text-sm">
            Service Sync Manager for Rancher Clusters
          </p>
        </div>
      </footer>

      {/* Login Modal */}
      <Modal
        open={showLogin}
        onCancel={() => setShowLogin(false)}
        footer={null}
        width={500}
        centered
        destroyOnClose
      >
        <LoginForm onSuccess={handleLoginSuccess} />
      </Modal>
    </div>
  );
};
