import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Brain,
  Calendar,
  Ear,
  Eye,
  FileText,
  Heart,
  MessageCircle,
  Pill,
  Smile,
  Sparkles,
  Stethoscope,
  Utensils,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DoctyLogo } from '@/components/docty-logo';

const programCards = [
  {
    icon: Calendar,
    title: '5 Saturdays',
    text: 'A structured on-campus program spread across five Saturdays for age-wise child wellness coverage.',
  },
  {
    icon: Heart,
    title: 'Child wellness screening',
    text: 'Nutrition, oral health, growth, mental wellness, vaccination awareness and early concern identification.',
  },
  {
    icon: FileText,
    title: 'Interactive parent experience',
    text: 'Live guided assessment questions with response-based notes that help parents understand habits and care needs.',
  },
  {
    icon: Sparkles,
    title: 'Personalised AI generated reports',
    text: 'A mobile-verified Health Passport with parent-friendly insights, next steps and clinician follow-up prompts.',
  },
];

const clinicianCards = [
  { icon: Stethoscope, title: 'Pediatrics', text: 'Growth, general health and recurring childhood concerns.' },
  { icon: Smile, title: 'Dental', text: 'Oral hygiene, cavity risk, tooth pain and brushing habits.' },
  { icon: Brain, title: 'Psychiatry', text: 'Behaviour, sleep, screen routine and emotional wellbeing prompts.' },
  { icon: Utensils, title: 'Nutrition', text: 'Food habits, breakfast routine, protein intake and healthy growth.' },
  { icon: Eye, title: 'Eye', text: 'Lazy eye awareness, squinting, strain and early vision screening.' },
  { icon: Ear, title: 'Audiometry', text: 'Hearing awareness and referral prompts where concerns are noticed.' },
];

const offerCards = [
  'Camp-linked consultation offers for participating families',
  'Dental, diagnostics and pharmacy follow-up packages',
  'Family wellness plans and vaccination counselling offers',
];

export default function SchoolCampCollaborationPage() {
  return (
    <div className="min-h-svh bg-[#f6fbfd] pt-24 text-[#082f49] md:pt-26">
      <section className="relative min-h-[calc(100svh-6rem)] overflow-hidden bg-[#f6fbfd]">
        <div
          className="absolute inset-0 bg-[url('/school-camp-healthy-kids-hero.png')] bg-[length:auto_80%] bg-[position:right_-130px_bottom_0] bg-no-repeat md:bg-[length:auto_100%] md:bg-[position:right_-66px_bottom_0]"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[linear-gradient(104deg,#ffffff_0%,#ffffff_37%,rgba(255,255,255,0.86)_56%,rgba(255,255,255,0.08)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(90deg,#fe065c_0%,#0bb8fc_58%,rgba(11,184,252,0)_100%)] opacity-95" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-[linear-gradient(0deg,#f6fbfd_0%,rgba(246,251,253,0)_100%)]" />
        <div className="absolute bottom-0 right-0 h-28 w-full bg-[linear-gradient(135deg,rgba(254,6,92,0.92)_0%,rgba(11,184,252,0.9)_52%,rgba(255,255,255,0)_53%)] opacity-75" />
        <div className="container relative mx-auto flex min-h-[calc(100svh-6rem)] max-w-6xl items-center px-4 py-10 md:py-14">
          <div className="max-w-2xl">
            <div className="flex w-fit flex-wrap items-center gap-3 rounded-md border border-white/70 bg-white/90 p-3 shadow-lg shadow-[#082f49]/10 ring-1 ring-[#dceaf1] backdrop-blur">
              <DoctyLogo size="md" />
              <div className="h-10 w-px bg-[#dceaf1]" />
              <img
                src="/sri-gayathri-techno-school-logo.png"
                alt="Sri Gayathri Techno Schools"
                className="h-10 w-auto"
              />
            </div>
            <Badge className="mt-6 rounded-full bg-[#082f49] px-4 py-1.5 text-white shadow-lg shadow-[#082f49]/20 hover:bg-[#082f49]">
              5-week interactive health journey
            </Badge>
            <h1 className="mt-5 text-5xl font-black leading-tight tracking-normal md:text-7xl">
              <span className="block text-[#fe065c] drop-shadow-sm">Healthy Kids</span>
              <span className="block text-[#0b7fae] drop-shadow-sm">Happy Futures</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg font-medium leading-8 text-[#082f49]">
              A Health & Wellness Camp for <span className="font-bold text-[#fe065c]">Sri Gayathri Techno School Students</span>, powered by Docty Clinics.
            </p>
            <div className="mt-6 grid max-w-xl grid-cols-2 gap-3 md:grid-cols-4">
              {['5 Saturdays', 'On Campus Camp', 'Live Assessment', 'AI Reports'].map((item) => (
                <div key={item} className="rounded-md border border-white/70 bg-[#082f49]/92 p-4 text-center text-white shadow-lg shadow-[#082f49]/15 backdrop-blur">
                  <p className="text-sm font-black leading-tight">{item}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 max-w-xl rounded-md border border-white/70 bg-white/92 p-4 shadow-xl shadow-[#fe065c]/10 backdrop-blur">
              <p className="text-sm font-black text-[#fe065c]">Exclusive Docty Total Care Subscription Offer</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-md bg-[#eaf8fe] p-4 shadow-inner">
                  <p className="text-xs font-bold text-[#082f49]">Students & Staff</p>
                  <p className="text-sm font-bold text-[#8aa0ad] line-through">Rs 999/-</p>
                  <p className="text-3xl font-black text-[#0b7fae]">Rs 199/-</p>
                </div>
                <div className="rounded-md bg-[#fff6fa] p-4 shadow-inner">
                  <p className="text-xs font-bold text-[#082f49]">Family Members</p>
                  <p className="text-sm font-bold text-[#8aa0ad] line-through">Rs 999/-</p>
                  <p className="text-3xl font-black text-[#fe065c]">Rs 399/-</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {programCards.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="overflow-hidden rounded-md border-[#dceaf1] bg-white shadow-lg shadow-[#082f49]/6">
                <CardHeader>
                  <div className="flex size-12 items-center justify-center rounded-full bg-[#fe065c] text-white shadow-lg shadow-[#fe065c]/25">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-xl tracking-normal">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-[#476477]">{item.text}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <Card className="rounded-md border-[#dceaf1] bg-white shadow-lg shadow-[#082f49]/6">
            <CardHeader>
              <Badge className="w-fit rounded-full bg-[#0b7fae] text-white hover:bg-[#0b7fae]">Clinician on Campus</Badge>
              <CardTitle className="text-2xl tracking-normal">Multi-speciality support for parent conversations</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {clinicianCards.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-md border border-[#dceaf1] bg-[#f9fdff] p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-[#0bb8fc] text-white">
                        <Icon className="size-5" />
                      </div>
                      <p className="font-semibold">{item.title}</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#476477]">{item.text}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="rounded-md border-[#dceaf1] bg-white shadow-sm">
            <CardHeader>
              <Badge className="w-fit bg-[#fe065c] text-white hover:bg-[#fe065c]">Health Passport snapshot</Badge>
              <CardTitle className="text-2xl tracking-normal">Parent-friendly screening summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-md border border-[#dceaf1] bg-white">
                <div className="bg-[#082f49] p-5 text-white">
                  <p className="text-sm font-semibold text-[#8ee4ff]">Docty Health Passport</p>
                  <h2 className="mt-2 text-2xl font-bold">Sample Student</h2>
                  <p className="mt-1 text-sm text-[#d7eef8]">Class 3 - Sri Gayathri Techno Schools</p>
                </div>
                <div className="grid gap-3 p-4">
                  <div className="rounded-md bg-[#fff6fa] p-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-5 text-[#fe065c]" />
                      <p className="font-bold">AI Health Passport Insight</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#476477]">
                      Screening responses create conversation points around nutrition, oral care, screen routine, growth and vaccination awareness.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md bg-[#f4f9fc] p-3 text-sm">
                      <span className="font-bold text-[#082f49]">Height:</span> 129 cm<br />
                      <span className="font-bold text-[#082f49]">Weight:</span> 30 kg<br />
                      <span className="font-bold text-[#082f49]">BMI:</span> 18.0
                    </div>
                    <div className="rounded-md bg-[#f4f9fc] p-3 text-sm">
                      <span className="font-bold text-[#082f49]">Nutrition:</span> 86<br />
                      <span className="font-bold text-[#082f49]">Oral:</span> 92<br />
                      <span className="font-bold text-[#082f49]">Mental wellbeing:</span> 88
                    </div>
                  </div>
                  <div className="rounded-md bg-[#eaf8fe] p-3">
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span>WHO growth chart preview</span>
                      <span className="text-[#0b7fae]">Growth review: normal range</span>
                    </div>
                    <div className="relative mt-4 h-3 rounded-full bg-gradient-to-r from-[#fee2e2] via-[#dcfce7] to-[#fee2e2]">
                      <span className="absolute -top-1 left-[54%] size-5 -translate-x-1/2 rounded-full border-2 border-white bg-[#fe065c] shadow" />
                    </div>
                    <div className="mt-3 flex justify-between text-[10px] font-semibold text-[#476477]">
                      <span>P3</span>
                      <span>P50</span>
                      <span>P97</span>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md bg-[#fff6fa] p-3 text-sm">Vaccination reminder includes record review and HPV counselling where age appropriate.</div>
                    <div className="rounded-md bg-[#fff6fa] p-3 text-sm">Recommendations guide parents to book pediatric, dental, eye or nutrition follow-up.</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-md border-[#dceaf1] bg-white shadow-sm">
            <CardHeader>
              <Badge className="w-fit bg-[#fe065c] text-white hover:bg-[#fe065c]">Docty Promotion Offers</Badge>
              <CardTitle className="text-2xl tracking-normal">Offers for participating families</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {offerCards.map((offer) => (
                <div key={offer} className="flex items-start gap-3 rounded-md bg-[#f4f9fc] p-3">
                  <BadgeCheck className="mt-0.5 size-5 shrink-0 text-[#0b7fae]" />
                  <p className="text-sm leading-6 text-[#476477]">{offer}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-md border-[#dceaf1] bg-[#082f49] text-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl tracking-normal">Designed for school community health</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-[#d7eef8]">
                The program is designed to help parents notice everyday health patterns early, receive structured guidance, and connect with the right clinician when a deeper review is needed.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="rounded-full bg-white text-[#082f49] hover:bg-white/90">
                  <Link to="/book-appointment">
                    Book Appointment
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20">
                  <a href="https://wa.me/919989804888">
                    <MessageCircle className="mr-2 size-4" />
                    WhatsApp Docty
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
