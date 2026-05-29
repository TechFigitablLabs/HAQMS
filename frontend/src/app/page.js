'use client';

import Link from 'next/link';
import {
  Activity,
  ShieldAlert,
  MonitorPlay,
  Users,
  ArrowRight,
  Stethoscope,
  Users2,
  ClipboardList,
  CheckCircle,
} from 'lucide-react';

export default function Home() {
  const heroSlides = [
    {
      src: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1800&q=85',
      alt: 'Doctors coordinating patient care in a modern hospital',
    },
    {
      src: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1800&q=85',
      alt: 'Doctor reviewing health information with a patient',
    },
    {
      src: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=1800&q=85',
      alt: 'Doctor consultation supporting patient recovery',
    },
    {
      src: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1800&q=85',
      alt: 'Medical team reviewing patient treatment plan',
    },
    {
      src: 'https://images.unsplash.com/photo-1551190822-a9333d879b1f?auto=format&fit=crop&w=1800&q=85',
      alt: 'Healthcare professional caring for a patient',
    },
    {
      src: 'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1800&q=85',
      alt: 'Doctor supporting patient health and recovery',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col justify-between">
      <div className="w-full text-center">
        <section className="hero-shell relative flex min-h-screen w-full items-center overflow-hidden rounded-none bg-white px-4 py-10 sm:px-8 sm:py-14 lg:px-10 xl:px-14">
          <div className="absolute inset-0 z-0">
            {heroSlides.map((slide, index) => (
              <div
                key={`hero-bg-${slide.src}`}
                className="hero-bg-photo-slide absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${slide.src})`,
                  animationDelay: `${index * -5}s`,
                }}
              />
            ))}
            <div className="absolute inset-0 bg-white/82" />
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-100/75 via-white/78 to-rose-50/82" />
            <div className="hero-grid-overlay absolute inset-0" />
          </div>

          <div className="absolute left-4 top-4 z-10 flex items-start gap-3 sm:left-10 sm:top-8">
            <Link href="/" className="flex items-start gap-3 text-slate-900">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-700 text-white shadow-lg shadow-cyan-700/25 sm:h-11 sm:w-11 sm:rounded-2xl">
                <Activity className="h-5 w-5" />
              </span>
              <span className="text-left">
                <span className="block text-base font-black tracking-tight sm:text-lg">HAQMS</span>
                <span className="block text-[10px] font-semibold uppercase text-slate-500 sm:text-xs">
                  Hospital Operations
                </span>
              </span>
            </Link>
          </div>

          <div className="relative z-10 grid w-full grid-cols-1 items-start gap-8 pt-16 sm:pt-8 lg:grid-cols-2 lg:gap-12">
            <div className="text-left lg:text-left pt-8">
              <div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-800 sm:mb-6 sm:text-sm">
                <Activity className="h-4 w-4" />
                <span className="truncate">Live queue and appointment control</span>
              </div>

              <h1 className="font-display hero-title text-3xl font-black text-slate-900 min-[380px]:text-4xl sm:text-5xl xl:text-6xl">
                HAQMS
              </h1>
              <p className="mt-3 text-base font-semibold leading-6 text-rose-700 sm:text-lg sm:leading-7 xl:text-xl">
                Hospital Appointment, Queue, and Care-Flow Command Center
              </p>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-700 sm:mt-6 sm:text-base sm:leading-8">
                A realtime hospital operations hub for scheduling, tokenized queues, and clinician handoffs.
                Built for speed, transparency, and front-desk clarity.
              </p>

              <div className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-2">
                <div className="glass flex items-start gap-3 rounded-2xl border border-cyan-500/15 p-4 shadow-sm sm:gap-4 sm:p-5">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-700 text-white shadow-lg shadow-cyan-700/20 sm:h-12 sm:w-12">
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-black text-slate-900 sm:text-lg">Lightning Fast Performance</p>
                    <p className="mt-1 text-sm font-semibold leading-5 text-slate-600 sm:text-base">
                      Real-time updates with sub-second response times
                    </p>
                  </div>
                </div>
                <div className="glass flex items-start gap-3 rounded-2xl border border-rose-500/15 p-4 shadow-sm sm:gap-4 sm:p-5">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-lg shadow-rose-600/20 sm:h-12 sm:w-12">
                    <ShieldAlert className="h-5 w-5 sm:h-6 sm:w-6" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-black text-slate-900 sm:text-lg">Healthcare Compliant</p>
                    <p className="mt-1 text-sm font-semibold leading-5 text-slate-600 sm:text-base">
                      HIPAA-ready security for sensitive patient data
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:gap-4">
                <Link href="/login" className="cta-primary justify-center">
                  Enter Staff Portal
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/queue" className="cta-secondary justify-center">
                  <MonitorPlay className="h-4 w-4" />
                  Watch Live Queue
                </Link>
              </div>

              <p className="mt-3 text-sm font-bold uppercase text-slate-500">
                Public monitor requires no login
              </p>
            </div>

            <div className="hidden lg:flex items-start justify-center pt-8">
              <div className="relative h-[550px] w-full overflow-hidden rounded-3xl shadow-2xl">
                {heroSlides.map((slide, index) => (
                  <div
                    key={`hero-card-${slide.src}`}
                    aria-label={slide.alt}
                    className="hero-photo-slide absolute inset-0 bg-cover bg-center"
                    role="img"
                    style={{
                      backgroundImage: `url(${slide.src})`,
                      animationDelay: `${index * -5}s`,
                    }}
                  />
                ))}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/35 via-transparent to-white/10" />
                <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/30 bg-white/82 p-4 text-left shadow-lg backdrop-blur-md">
                  <p className="text-sm font-black uppercase text-cyan-800">Care in motion</p>
                  <p className="mt-1 text-base font-semibold text-slate-700">
                    Coordinated doctors, faster queues, and calmer patient journeys.
                  </p>
                  <div className="mt-3 flex gap-1.5">
                    {heroSlides.map((slide, index) => (
                      <span
                        key={`hero-dot-${slide.src}`}
                        className="hero-carousel-dot h-1.5 flex-1 rounded-full bg-cyan-700/30"
                        style={{ animationDelay: `${index * -5}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="app-shell px-4 py-10 sm:px-8 sm:py-12">
          <section className="grid w-full gap-8 sm:grid-cols-2 lg:gap-10">
            <Link href="/login" className="group">
              <div className="glass rounded-2xl border border-slate-200 p-5 text-left shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/50 hover:shadow-cyan-500/10 dark:border-slate-800 sm:p-8 lg:p-10">
                <div className="w-fit rounded-xl bg-cyan-500/15 p-3 text-cyan-800 transition-colors duration-300 group-hover:bg-cyan-700 group-hover:text-white sm:p-4">
                  <Users className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
                <h2 className="mt-5 flex items-center gap-2 text-2xl font-bold text-slate-900 sm:mt-6 sm:text-4xl">
                  Staff Portal
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </h2>
                <p className="mt-3 text-base leading-7 text-slate-600 sm:text-xl">
                  Access specialized dashboards for administrators, doctors, and receptionists.
                </p>
                <ul className="mt-6 space-y-3 text-base font-semibold text-slate-600 sm:text-lg">
                  <li>✓ Patient intake, appointment booking, and queue tokening</li>
                  <li>✓ Doctor worklist updates and status changes</li>
                  <li>✓ Administrative review and physician registry access</li>
                </ul>
              </div>
            </Link>

            <Link href="/queue" className="group">
              <div className="glass rounded-2xl border border-slate-200 p-5 text-left shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-rose-500/50 hover:shadow-rose-500/10 dark:border-slate-800 sm:p-8 lg:p-10">
                <div className="w-fit rounded-xl bg-rose-500/15 p-3 text-rose-700 transition-colors duration-300 group-hover:bg-rose-600 group-hover:text-white sm:p-4">
                  <MonitorPlay className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
                <h2 className="mt-5 flex items-center gap-2 text-2xl font-bold text-slate-900 sm:mt-6 sm:text-4xl">
                  Live Public Monitor
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </h2>
                <p className="mt-3 text-base leading-7 text-slate-600 sm:text-xl">
                  Track active check-ins and calling tokens by physician with automatic refresh.
                </p>
                <ul className="mt-6 space-y-3 text-base font-semibold text-slate-600 sm:text-lg">
                  <li>✓ Now-calling token display for waiting areas</li>
                  <li>✓ Live updates every few seconds</li>
                  <li>✓ Easy public access without login</li>
                </ul>
              </div>
            </Link>
          </section>

          <section className="mt-12 rounded-3xl bg-gradient-to-br from-cyan-50 to-rose-50 p-5 shadow-lg sm:mt-16 sm:p-10 lg:p-16">
            <h2 className="text-center text-2xl font-black text-slate-900 sm:text-4xl lg:text-5xl">
              Healthcare Flow in Action
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-7 text-slate-600 sm:text-2xl">
              See how HAQMS transforms patient care delivery
            </p>

            <div className="mt-8 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
              <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-5 shadow-md transition-all hover:shadow-lg hover:scale-105 sm:p-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-100 sm:h-24 sm:w-24">
                  <Users2 className="h-8 w-8 text-cyan-700 sm:h-12 sm:w-12" />
                </div>
                <h3 className="text-center text-xl font-black text-slate-900 sm:text-2xl">Patient Check-in</h3>
                <p className="text-center text-base text-slate-600">
                  Reception staff quickly registers patients and assigns queue tokens
                </p>
              </div>

              <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-5 shadow-md transition-all hover:shadow-lg hover:scale-105 sm:p-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 sm:h-24 sm:w-24">
                  <ClipboardList className="h-8 w-8 text-rose-700 sm:h-12 sm:w-12" />
                </div>
                <h3 className="text-center text-xl font-black text-slate-900 sm:text-2xl">Appointment Booking</h3>
                <p className="text-center text-base text-slate-600">
                  Schedule consultations with doctors based on availability
                </p>
              </div>

              <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-5 shadow-md transition-all hover:shadow-lg hover:scale-105 sm:p-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 sm:h-24 sm:w-24">
                  <Stethoscope className="h-8 w-8 text-amber-700 sm:h-12 sm:w-12" />
                </div>
                <h3 className="text-center text-xl font-black text-slate-900 sm:text-2xl">Doctor Consultation</h3>
                <p className="text-center text-base text-slate-600">
                  Doctors manage their worklist and provide patient care
                </p>
              </div>

              <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-5 shadow-md transition-all hover:shadow-lg hover:scale-105 sm:p-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 sm:h-24 sm:w-24">
                  <CheckCircle className="h-8 w-8 text-emerald-700 sm:h-12 sm:w-12" />
                </div>
                <h3 className="text-center text-xl font-black text-slate-900 sm:text-2xl">Completion & Discharge</h3>
                <p className="text-center text-base text-slate-600">
                  Mark consultations complete and manage patient follow-ups
                </p>
              </div>
            </div>
          </section>

        </div>

        <section className="app-shell bg-gradient-to-r from-cyan-700 via-cyan-600 to-rose-600 px-4 py-14 sm:px-8 sm:py-20 md:py-24">
          <div className="mx-auto flex max-w-4xl flex-col items-center justify-center text-center">
            <h2 className="text-2xl font-black leading-tight text-white sm:text-4xl md:text-5xl">
              Ready to streamline your hospital operations?
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-cyan-50 sm:text-2xl">
              Join dozens of hospitals using HAQMS to reduce wait times, improve staff coordination, and keep patients informed in real time.
            </p>
            <div className="mt-8 flex w-full max-w-md flex-col gap-4 sm:w-auto sm:max-w-none sm:flex-row">
              <Link href="/login" className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3.5 font-bold text-cyan-700 shadow-lg transition-all hover:shadow-xl hover:scale-105 sm:px-8">
                Get Started Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link href="/queue" className="inline-flex items-center justify-center rounded-lg border-2 border-white px-6 py-3.5 font-bold text-white transition-all hover:bg-white/10 sm:px-8">
                <MonitorPlay className="mr-2 h-5 w-5" />
                View Live Demo
              </Link>
            </div>
          </div>
        </section>

      <div className="ticker mt-6">
        <div className="ticker-track">
          {[
            'Emergency intake',
            'Radiology',
            'Pharmacy',
            'Pediatrics',
            'Orthopedics',
            'Outpatient clinic',
            'Cardiology',
            'Lab services',
            'Surgical prep',
            'Discharge desk',
          ].map((item) => (
            <span key={item} className="ticker-item">
              <span className="h-2 w-2 rounded-full bg-cyan-600" />
              {item}
            </span>
          ))}
          {[
            'Emergency intake',
            'Radiology',
            'Pharmacy',
            'Pediatrics',
            'Orthopedics',
            'Outpatient clinic',
            'Cardiology',
            'Lab services',
            'Surgical prep',
            'Discharge desk',
          ].map((item, index) => (
            <span key={`${item}-repeat-${index}`} className="ticker-item">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              {item}
            </span>
          ))}
        </div>
      </div>

      <footer className="bg-slate-900 px-6 py-12 text-slate-400 sm:px-8 sm:py-16">
        <div className="app-shell mx-auto">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 text-white">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-600 text-sm font-black">
                  H
                </span>
                <span className="font-black">HAQMS</span>
              </div>
              <p className="mt-3 text-base leading-6">
                Hospital Appointment & Queue Management System — transforming patient flow and staff coordination.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white">Quick Links</h4>
              <ul className="mt-3 space-y-2 text-base">
                <li>
                  <Link href="/login" className="hover:text-cyan-400 transition-colors">
                    Staff Portal
                  </Link>
                </li>
                <li>
                  <Link href="/queue" className="hover:text-cyan-400 transition-colors">
                    Live Queue Monitor
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white">For Healthcare Admins</h4>
              <ul className="mt-3 space-y-2 text-base">
                <li>Patient intake workflows</li>
                <li>Appointment scheduling</li>
                <li>Real-time queue display</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white">Build with Purpose</h4>
              <p className="mt-3 text-base leading-6">
                HAQMS was created as an assessment framework to identify and evaluate software engineering skills through a deliberately flawed but fully functional reference application.
              </p>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-700 pt-8 text-center text-xs">
            <p className="text-slate-500">
              HAQMS v1.0.0-deliberate-bugs &copy; {new Date().getFullYear()} Candidate Evaluation Framework. | Built for educational assessment purposes.
            </p>
          </div>
        </div>
      </footer>
    </div>
    </div>
  );
}
