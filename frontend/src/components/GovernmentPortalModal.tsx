import React, { useState, useEffect } from 'react';
import {
  Landmark,
  X,
  FileText,
  Download,
  Search,
  CheckCircle2,
  Shield,
} from 'lucide-react';
import {
  fetchGovernmentAnnouncements,
  fetchGovernmentDocuments,
  publishGovernmentAnnouncement,
} from '../services/api';

interface GovernmentPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any | null;
  currentLang?: string;
}

export default function GovernmentPortalModal({
  isOpen,
  onClose,
  currentUser,
}: GovernmentPortalModalProps) {
  const [tab, setTab] = useState<'ANNOUNCEMENTS' | 'DOCUMENTS' | 'PUBLISH'>('ANNOUNCEMENTS');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any | null>(null);

  // Publish Form State
  const [pubTitle, setPubTitle] = useState('');
  const [pubAuthority, setPubAuthority] = useState('Department of Fisheries, Government of India');
  const [pubState, setPubState] = useState('National');
  const [pubEffective, setPubEffective] = useState('Immediate Effect');
  const [pubCategory, setPubCategory] = useState('General Fisheries Advisory');
  const [pubSummary, setPubSummary] = useState('');
  const [pubFullText, setPubFullText] = useState('');
  const [pubUrgent, setPubUrgent] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchGovernmentAnnouncements().then((data) => {
        if (Array.isArray(data)) setAnnouncements(data);
      }).catch(() => {});

      fetchGovernmentDocuments().then((data) => {
        if (Array.isArray(data)) setDocuments(data);
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await publishGovernmentAnnouncement({
        title: pubTitle,
        issuing_authority: pubAuthority,
        state_or_national: pubState,
        effective_dates: pubEffective,
        category: pubCategory,
        summary: pubSummary,
        full_text: pubFullText,
        reference_number: `DOF/PUB/${Date.now().toString().slice(-6)}`,
        is_urgent: pubUrgent,
      });

      setAnnouncements((prev) => [res, ...prev]);
      setPublishSuccess(true);
      setTimeout(() => {
        setPublishSuccess(false);
        setTab('ANNOUNCEMENTS');
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to publish circular');
    }
  };

  const filteredAnnouncements = announcements.filter((a) => {
    const matchSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchState = selectedState === 'ALL' || a.state_or_national.includes(selectedState);
    const matchCat = selectedCategory === 'ALL' || a.category === selectedCategory;
    return matchSearch && matchState && matchCat;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn font-sans">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-2xl text-slate-900 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B4A72] flex items-center justify-center text-white shadow-sm">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Official Government Marine Information Portal
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[#0B4A72] font-mono">
                  GoI Verified
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Department of Fisheries • Indian Coast Guard • Marine Regulations
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 my-3 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setTab('ANNOUNCEMENTS')}
            className={`flex-1 py-2 rounded-lg transition cursor-pointer ${
              tab === 'ANNOUNCEMENTS' ? 'bg-white text-[#0B4A72] shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🏛️ Official Circulars & Bans
          </button>
          <button
            type="button"
            onClick={() => setTab('DOCUMENTS')}
            className={`flex-1 py-2 rounded-lg transition cursor-pointer ${
              tab === 'DOCUMENTS' ? 'bg-white text-[#0B4A72] shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📄 Schemes & Guidelines
          </button>
          {currentUser?.role === 'GOVERNMENT' || currentUser?.role === 'SUPER_ADMIN' ? (
            <button
              type="button"
              onClick={() => setTab('PUBLISH')}
              className={`flex-1 py-2 rounded-lg transition cursor-pointer ${
                tab === 'PUBLISH' ? 'bg-[#0B4A72] text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ✍️ Publish Circular
            </button>
          ) : null}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 scrollbar-thin">
          {tab === 'ANNOUNCEMENTS' && (
            <>
              {/* Search, State, and Category Filter Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search circulars, monsoon ban..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-8.5 bg-slate-50 text-slate-900 rounded-xl pl-8 pr-3 border border-slate-200 text-xs focus:outline-none focus:border-[#0B4A72]"
                  />
                </div>

                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full h-8.5 bg-slate-50 text-slate-800 rounded-xl px-3 border border-slate-200 text-xs focus:outline-none focus:border-[#0B4A72]"
                >
                  <option value="ALL">All Coastal States</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Goa">Goa</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Kerala">Kerala</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                  <option value="Odisha">Odisha</option>
                  <option value="West Bengal">West Bengal</option>
                </select>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-8.5 bg-slate-50 text-slate-800 rounded-xl px-3 border border-slate-200 text-xs focus:outline-none focus:border-[#0B4A72]"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Monsoon & Safety Fishing Ban">Monsoon Fishing Bans</option>
                  <option value="Cyclone & Storm Surge Warning">Cyclone Warnings</option>
                  <option value="Government Schemes & PMMSY Subsidy">PMMSY Subsidies</option>
                  <option value="Maritime Regulation & AIS Mandate">AIS & Vessel Mandates</option>
                  <option value="General Fisheries Advisory">General Advisories</option>
                </select>
              </div>

              {/* Detail View Drawer or List */}
              {selectedAnnouncement ? (
                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 text-xs space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                    <span className="text-[11px] font-bold font-mono text-[#0B4A72] flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      <span>{selectedAnnouncement.reference_number}</span>
                    </span>
                    <button
                      onClick={() => setSelectedAnnouncement(null)}
                      className="text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
                    >
                      ← Back to list
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {selectedAnnouncement.title}
                  </h3>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 font-medium">
                    <div>
                      <strong>Issuing Authority:</strong> {selectedAnnouncement.issuing_authority}
                    </div>
                    <div>
                      <strong>Applicable Region:</strong> {selectedAnnouncement.state_or_national}
                    </div>
                    <div>
                      <strong>Effective Dates:</strong> {selectedAnnouncement.effective_dates}
                    </div>
                    <div>
                      <strong>Published:</strong> {selectedAnnouncement.publish_date}
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-2">
                    <p className="font-semibold text-slate-900">Official Executive Order:</p>
                    <p>{selectedAnnouncement.full_text}</p>
                  </div>
                </div>
              ) : (
                /* Announcements List */
                <div className="space-y-2.5">
                  {filteredAnnouncements.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs font-mono">
                      No government circulars found matching your search.
                    </div>
                  ) : (
                    filteredAnnouncements.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedAnnouncement(item)}
                        className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-sm transition cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.2 rounded-md bg-blue-50 border border-blue-200 text-[#0B4A72] text-[10px] font-bold font-mono">
                              {item.category}
                            </span>
                            {item.is_urgent && (
                              <span className="px-1.5 py-0.2 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold font-mono animate-pulse">
                                URGENT
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {item.publish_date}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 mb-1">
                          {item.title}
                        </h4>

                        <p className="text-[11px] text-slate-600 leading-relaxed mb-2 line-clamp-2">
                          {item.summary}
                        </p>

                        <div className="flex items-center justify-between text-[10px] font-medium text-slate-500 border-t border-slate-100 pt-1.5">
                          <span>{item.issuing_authority}</span>
                          <span className="text-[#0B4A72] font-semibold">Read Full Gazette →</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}

          {tab === 'DOCUMENTS' && (
            <div className="space-y-2.5">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between gap-3 hover:border-blue-300 hover:shadow-xs transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0B4A72] shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 mb-0.5">{doc.title}</h4>
                      <p className="text-[11px] text-slate-500">{doc.description}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-1">
                        <span>{doc.department}</span>
                        <span>•</span>
                        <span>{doc.file_size_kb} KB PDF</span>
                      </div>
                    </div>
                  </div>

                  <a
                    href={doc.download_url}
                    download
                    onClick={(e) => {
                      e.preventDefault();
                      alert(`Downloading official PDF: ${doc.title}`);
                    }}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-blue-50 border border-slate-200 text-slate-700 hover:text-[#0B4A72] shrink-0 transition"
                    title="Download PDF"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          )}

          {tab === 'PUBLISH' && (
            <form onSubmit={handlePublishSubmit} className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              {publishSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 font-bold animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Circular published successfully to national coastal feed!</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Circular Headline / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cyclone Shakti Warning & Port Signal 3 Hoisted"
                  value={pubTitle}
                  onChange={(e) => setPubTitle(e.target.value)}
                  className="w-full h-8.5 bg-white text-slate-900 rounded-xl px-3 border border-slate-200 focus:outline-none focus:border-[#0B4A72]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Issuing Authority</label>
                  <input
                    type="text"
                    value={pubAuthority}
                    onChange={(e) => setPubAuthority(e.target.value)}
                    className="w-full h-8 bg-white text-slate-900 rounded-xl px-2.5 border border-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Target State</label>
                  <select
                    value={pubState}
                    onChange={(e) => setPubState(e.target.value)}
                    className="w-full h-8 bg-white text-slate-900 rounded-xl px-2 border border-slate-200 focus:outline-none"
                  >
                    <option value="National">National (All States)</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Effective Period</label>
                  <input
                    type="text"
                    value={pubEffective}
                    onChange={(e) => setPubEffective(e.target.value)}
                    className="w-full h-8 bg-white text-slate-900 rounded-xl px-2.5 border border-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">Category</label>
                <select
                  value={pubCategory}
                  onChange={(e) => setPubCategory(e.target.value)}
                  className="w-full h-8 bg-white text-slate-900 rounded-xl px-2 border border-slate-200 focus:outline-none"
                >
                  <option value="Monsoon & Safety Fishing Ban">Monsoon & Safety Fishing Ban</option>
                  <option value="Cyclone & Storm Surge Warning">Cyclone & Storm Surge Warning</option>
                  <option value="Government Schemes & PMMSY Subsidy">Government Schemes & PMMSY Subsidy</option>
                  <option value="Maritime Regulation & AIS Mandate">Maritime Regulation & AIS Mandate</option>
                  <option value="General Fisheries Advisory">General Fisheries Advisory</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Brief Summary for Fishermen</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Short clear summary..."
                  value={pubSummary}
                  onChange={(e) => setPubSummary(e.target.value)}
                  className="w-full bg-white text-slate-900 rounded-xl p-2.5 border border-slate-200 focus:outline-none focus:border-[#0B4A72]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Full Gazette Text</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Complete regulatory text..."
                  value={pubFullText}
                  onChange={(e) => setPubFullText(e.target.value)}
                  className="w-full bg-white text-slate-900 rounded-xl p-2.5 border border-slate-200 focus:outline-none focus:border-[#0B4A72]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="urgentFlag"
                  checked={pubUrgent}
                  onChange={(e) => setPubUrgent(e.target.checked)}
                  className="rounded border-slate-300 text-[#0B4A72]"
                />
                <label htmlFor="urgentFlag" className="text-xs font-semibold text-slate-700">
                  Mark as Urgent Alert (Flashes top emergency banner)
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#0B4A72] hover:bg-[#083857] text-white font-bold text-xs transition active:scale-95 cursor-pointer shadow-xs"
              >
                Publish Official Advisory to Coastal Vessels
              </button>
            </form>
          )}
        </div>

        {/* Footer Close */}
        <div className="pt-3 border-t border-slate-200 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            Close Government Portal
          </button>
        </div>
      </div>
    </div>
  );
}
