"use client";

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui';
import Header from '@/components/layout';
import Footer from '@/components/layout';
import { useAppTranslation } from '@/lib/i18n/useAppTranslation';
import { landingFeatures } from '@/lib/landing';
import type { LucideIcon } from 'lucide-react';

/**
 * Resolve a Lucide icon component by its string name.
 * Falls back to a simple circle placeholder when the name is unrecognised.
 */
function resolveIcon(name: string): LucideIcon {
  const icons = LucideIcons as unknown as Record<string, LucideIcon>;
  return icons[name] ?? LucideIcons.Circle;
}

export default function LandingPage() {
  const { t } = useAppTranslation();
  return (
    <div className="min-h-screen bg-card text-foreground">
      <Header />

      {/* Hero Section */}
      <main id="main-content" tabIndex={-1} className="pt-12 pb-12 lg:pt-36 lg:pb-32">
        <div className="container mx-auto px-6 text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-sm text-primary font-medium mb-10">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
            {t('landing.badge')}
          </div>

          {/* Headline */}
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter max-w-4xl mx-auto leading-tight text-foreground">
            {t('landing.headline')}{' '}
            <br className="hidden lg:block" />
            <span className="text-primary">{t('landing.headlineAccent')}</span>
          </h1>

          <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t('landing.description')}
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/register">
              <Button className="h-12 px-8 text-base bg-primary text-white hover:bg-primary font-semibold rounded-xl">
                {t('landing.primaryCta')}
                <ArrowRight className="ml-2 w-5 h-5" aria-hidden="true" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" className="h-12 px-8 text-base border-border bg-card text-foreground hover:bg-muted font-medium rounded-xl">
                {t('landing.secondaryCta')}
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Divider */}
      <div className="border-t border-border" aria-hidden="true" />

      {/* Features Section */}
      <section id="features" className="py-24 bg-muted">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4 text-foreground">
              {t('landing.featuresTitle')}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              {t('landing.featuresDescription')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6" role="list">
            {landingFeatures.map((feature, i) => {
              const Icon = resolveIcon(feature.iconName);
              const card = (
                <div
                  key={feature.titleKey}
                  className={`group relative overflow-hidden p-8 rounded-3xl bg-card border border-border hover:border-primary/40 hover:shadow-lg transition-all duration-300 ${
                    i === 0 ? "md:col-span-8 md:row-span-2 flex flex-col justify-center min-h-[400px]" : "md:col-span-4"
                  }`}
                  role="listitem"
                >
                  {/* Subtle background decoration for the primary card */}
                  {i === 0 && (
                    <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-500" aria-hidden="true" />
                  )}

                  <div className={`relative z-10 w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 ${i === 0 ? 'w-16 h-16 mb-8' : ''}`} aria-hidden="true">
                    <Icon className={`text-primary ${i === 0 ? 'w-8 h-8' : 'w-6 h-6'}`} />
                  </div>

                  <div className="relative z-10">
                    <h3 className={`font-bold mb-3 text-foreground ${i === 0 ? 'text-3xl lg:text-4xl' : 'text-xl'}`}>
                      {t(`landing.features.${feature.titleKey}.title`)}
                    </h3>
                    <p className={`text-muted-foreground leading-relaxed ${i === 0 ? 'text-lg max-w-xl' : 'text-base'}`}>
                      {t(`landing.features.${feature.descriptionKey}.description`)}
                    </p>
                  </div>
                </div>
              );

              // Wrap the card in a link if a `link` is provided.
              if (feature.link) {
                return (
                  <Link key={feature.titleKey} href={feature.link} className={`block ${i === 0 ? "md:col-span-8 md:row-span-2" : "md:col-span-4"}`}>
                    {card}
                  </Link>
                );
              }

              return card;
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
