import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, FileText, Lock, X, Search, Printer, CheckCircle2, Building2, Users, BookOpen } from 'lucide-react';

export default function LegalModal({ isOpen, onClose, initialTab = 'privacy' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const highlightMatch = (text) => {
    if (!searchQuery.trim()) return text;
    const parts = text.split(new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-yellow-400/40 text-yellow-200 px-0.5 rounded font-semibold">
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn print:p-0 print:bg-white print:static"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-h-none print:w-full print:bg-white print:text-black"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 id="legal-modal-title" className="text-xl font-bold text-white flex items-center gap-2">
                Legal & Student Data Privacy Center
              </h2>
              <p className="text-xs text-slate-400">
                Compliance standards for FERPA, COPPA, SOPIPA & State Educational Data Privacy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm flex items-center gap-1.5 transition-colors border border-slate-700"
              title="Print Document"
              aria-label="Print Document"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation & Search Bar */}
        <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('privacy')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'privacy'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-semibold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Lock className="w-4 h-4" />
              Privacy Policy
            </button>
            <button
              onClick={() => setActiveTab('terms')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'terms'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-semibold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              Terms of Service
            </button>
            <button
              onClick={() => setActiveTab('compliance')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'compliance'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 font-semibold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Shield className="w-4 h-4" />
              Student Privacy Summary
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search policy terms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 text-white text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 placeholder-slate-500"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-slate-300 text-sm leading-relaxed print:text-black print:overflow-visible">

          {/* TAB 1: PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl p-4 flex items-start gap-3 print:border-slate-300 print:bg-slate-50">
                <ShieldCheck className="w-6 h-6 text-blue-400 shrink-0 mt-0.5 print:text-blue-700" />
                <div>
                  <h3 className="text-white font-semibold text-base print:text-black">K-12 Student Privacy Commitment</h3>
                  <p className="text-xs text-blue-200/80 mt-1 print:text-slate-700">
                    Level Up Adventure Mission is designed for classroom and institutional use. We strictly adhere to federal and state student privacy standards including <strong>FERPA</strong>, <strong>COPPA</strong>, and <strong>SOPIPA</strong>. We do not sell student data, nor do we display targeted advertisements.
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 print:text-slate-600">Effective Date: August 7, 2026 | Last Updated: August 2026</p>
              </div>

              <section className="space-y-2">
                <h4 className="text-white font-bold text-base print:text-black">1. Information We Collect</h4>
                <p>{highlightMatch("We practice strict data minimization. The platform collects only the essential data required to deliver gamified educational missions, track learning progress, and support classroom instruction:")}</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-300 print:text-slate-800">
                  <li><strong>{highlightMatch("Student Identifiers:")}</strong> {highlightMatch("Student first name or teacher-assigned display nickname. Student personal email addresses are NOT required for student join workflows.")}</li>
                  <li><strong>{highlightMatch("Educator Account Information:")}</strong> {highlightMatch("Teacher/administrator full name, institutional email address, school/district organization name, and authorization credentials.")}</li>
                  <li><strong>{highlightMatch("Educational Activity & Progress:")}</strong> {highlightMatch("Quest responses, assignment submissions, score records, earned XP, game badges, avatar customization choices, and streak statistics.")}</li>
                  <li><strong>{highlightMatch("Classroom Context:")}</strong> {highlightMatch("Class codes, roster associations, guild assignments, and teacher feedback notes.")}</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="text-white font-bold text-base print:text-black">2. Compliance with Federal & State Laws</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-3 print:grid-cols-1">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 print:bg-slate-50 print:border-slate-300">
                    <h5 className="font-semibold text-blue-400 flex items-center gap-2 print:text-blue-800">
                      <BookOpen className="w-4 h-4" /> FERPA (Family Educational Rights & Privacy Act)
                    </h5>
                    <p className="text-xs text-slate-400 mt-2 print:text-slate-700">
                      {highlightMatch("Student record data remains under the direct control of the educational institution. We act as a designated school official under FERPA, utilizing student data solely to perform legitimate educational services.")}
                    </p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 print:bg-slate-50 print:border-slate-300">
                    <h5 className="font-semibold text-emerald-400 flex items-center gap-2 print:text-emerald-800">
                      <Shield className="w-4 h-4" /> COPPA (Children's Online Privacy Protection Act)
                    </h5>
                    <p className="text-xs text-slate-400 mt-2 print:text-slate-700">
                      {highlightMatch("For students under 13, schools act as agents on behalf of parents to provide consent for the collection of student information within the educational context.")}
                    </p>
                  </div>
                </div>
                <p>{highlightMatch("We also comply with state student data privacy statutes including California SOPIPA (Student Online Personal Information Protection Act), New York Education Law 2-d, Illinois SOPPA, and equivalent local school district privacy agreements.")}</p>
              </section>

              <section className="space-y-2">
                <h4 className="text-white font-bold text-base print:text-black">3. Zero Commercial Advertising & No Data Sale Pledge</h4>
                <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-emerald-300 text-xs font-medium print:bg-slate-100 print:text-slate-900 print:border-slate-300">
                  {highlightMatch("PLEDGE: We NEVER sell, rent, or trade student personal information. We NEVER use student data to build commercial profiles or target advertisements to students.")}
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="text-white font-bold text-base print:text-black">4. Data Security & Storage</h4>
                <p>{highlightMatch("All data transmitted to and from the service is encrypted using TLS/SSL protocols. Data at rest is stored in secure cloud infrastructure (Firebase/Firestore) protected by role-based security rules that restrict data access exclusively to verified class teachers, district administrators, and the authorized student.")}</p>
              </section>

              <section className="space-y-2">
                <h4 className="text-white font-bold text-base print:text-black">5. Data Retention & Deletion Rights</h4>
                <p>{highlightMatch("Educational data is retained only for the duration specified by the licensing school or district. Parents, guardians, or authorized school administrators may request review, correction, export, or complete deletion of student personal information at any time by contacting their school administrator or submitting a request to our privacy team.")}</p>
              </section>

              <section className="space-y-2">
                <h4 className="text-white font-bold text-base print:text-black">6. Contact Information</h4>
                <p>{highlightMatch("For privacy inquiries, FERPA/COPPA compliance validation, or data deletion requests, contact:")}</p>
                <div className="bg-slate-950 p-3 rounded-lg text-xs font-mono text-slate-400 print:bg-slate-100 print:text-slate-800">
                  Student Data Privacy & Compliance Officer<br />
                  Email: support@getpathweave.com<br />
                  Pathweave LLC
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: TERMS OF SERVICE */}
          {activeTab === 'terms' && (
            <div className="space-y-6">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-start gap-3 print:bg-slate-50 print:border-slate-300">
                <FileText className="w-6 h-6 text-blue-400 shrink-0 mt-0.5 print:text-blue-700" />
                <div>
                  <h3 className="text-white font-semibold text-base print:text-black">Terms of Service for Educational Use</h3>
                  <p className="text-xs text-slate-400 mt-1 print:text-slate-700">
                    These Terms govern access to Level Up Adventure Mission for teachers, school administrators, students, and educational institutions.
                  </p>
                </div>
              </div>

              <section className="space-y-2">
                <h4 className="text-white font-bold text-base print:text-black">1. Acceptance of Terms</h4>
                <p>{highlightMatch("By creating an account, joining a class using a Class Code, or accessing Level Up Adventure Mission, you agree to these Terms of Service. If you are an educator or administrator accessing the service on behalf of a school or district, you represent that you have authority to bind your institution.")}</p>
              </section>

              <section className="space-y-2">
                <h4 className="text-white font-bold text-base print:text-black">2. Authorized Use & Account Responsibilities</h4>
                <ul className="list-disc pl-5 space-y-1 text-slate-300 print:text-slate-800">
                  <li><strong>{highlightMatch("Educator Accounts:")}</strong> {highlightMatch("Teachers and school staff must use official institutional credentials when registering and maintaining class rosters.")}</li>
                  <li><strong>{highlightMatch("Student Access:")}</strong> {highlightMatch("Students access the service via teacher-generated Class Codes or rosters under the supervision of their school.")}</li>
                  <li><strong>{highlightMatch("Credential Protection:")}</strong> {highlightMatch("Users are responsible for maintaining the confidentiality of their passwords and Class Codes.")}</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="text-white font-bold text-base print:text-black">3. Acceptable Student Conduct</h4>
                <p>{highlightMatch("The platform is a safe, constructive educational environment. Users agree not to submit content that is inappropriate, offensive, harmful, infringing on intellectual property, or disruptive to classroom learning. Teachers reserve the right to review and remove student submissions.")}</p>
              </section>

              <section className="space-y-2">
                <h4 className="text-white font-bold text-base print:text-black">4. Intellectual Property</h4>
                <p>{highlightMatch("All mission content, avatar graphics, game mechanics, and software code are the property of Pathweave LLC. Student-created submission answers and original work remain the intellectual property of the student or school district in accordance with district policies.")}</p>
              </section>

              <section className="space-y-2">
                <h4 className="text-white font-bold text-base print:text-black">5. Service Availability & Modifications</h4>
                <p>{highlightMatch("We strive for 99.9% uptime during school operating hours. Scheduled maintenance is conducted outside peak instructional times. Features may be updated continuously to improve learning outcomes and security.")}</p>
              </section>

              <section className="space-y-2">
                <h4 className="text-white font-bold text-base print:text-black">6. Disclaimers & Limitation of Liability</h4>
                <p>{highlightMatch("The platform is provided 'as is' for educational enrichment. To the extent permitted by law, Pathweave LLC shall not be liable for indirect, incidental, or consequential damages resulting from service interruptions or user misuse.")}</p>
              </section>
            </div>
          )}

          {/* TAB 3: STUDENT PRIVACY SUMMARY */}
          {activeTab === 'compliance' && (
            <div className="space-y-6">
              <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-4 flex items-start gap-3 print:bg-slate-50 print:border-slate-300">
                <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5 print:text-emerald-700" />
                <div>
                  <h3 className="text-white font-semibold text-base print:text-black">Student Data Privacy & Legal Compliance Matrix</h3>
                  <p className="text-xs text-emerald-200/80 mt-1 print:text-slate-700">
                    A quick reference summary of how Level Up Adventure Mission satisfies federal, state, and local compliance standards for classroom technology deployment.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 print:bg-slate-50 print:border-slate-300">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm print:text-emerald-800">
                    <CheckCircle2 className="w-4 h-4" /> FERPA Compliant
                  </div>
                  <p className="text-xs text-slate-400 print:text-slate-700">
                    Student records remain school property. No unauthorized disclosures or third-party sharing.
                  </p>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 print:bg-slate-50 print:border-slate-300">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm print:text-emerald-800">
                    <CheckCircle2 className="w-4 h-4" /> COPPA Safe Harbor
                  </div>
                  <p className="text-xs text-slate-400 print:text-slate-700">
                    Supports school-provided consent for students under 13. Minimal data collection without required email.
                  </p>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 print:bg-slate-50 print:border-slate-300">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm print:text-emerald-800">
                    <CheckCircle2 className="w-4 h-4" /> SOPIPA & State Laws
                  </div>
                  <p className="text-xs text-slate-400 print:text-slate-700">
                    Strict prohibition against advertising, student profiling, and selling personal information.
                  </p>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 print:bg-slate-50 print:border-slate-300">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm print:text-emerald-800">
                    <CheckCircle2 className="w-4 h-4" /> Data Encryption & Access Control
                  </div>
                  <p className="text-xs text-slate-400 print:text-slate-700">
                    TLS encryption in transit and role-scoped Firestore security policies protecting data at rest.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 print:bg-slate-50 print:border-slate-300">
                <h4 className="text-white font-bold text-sm flex items-center gap-2 print:text-black">
                  <Building2 className="w-4 h-4 text-blue-400" /> District Data Privacy Agreements (DPA)
                </h4>
                <p className="text-xs text-slate-400 print:text-slate-700">
                  We partner with school districts, County Offices of Education, and regional IT consortia to sign standardized Student Data Privacy Agreements (e.g., National SDPC DPA / NDPA). School administrators may contact <span className="text-blue-400 font-mono">support@getpathweave.com</span> to submit custom district agreements for execution.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 print:hidden">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            <span>Secure Student Data Protocol Active</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors"
          >
            Close Document
          </button>
        </div>
      </div>
    </div>
  );
}
