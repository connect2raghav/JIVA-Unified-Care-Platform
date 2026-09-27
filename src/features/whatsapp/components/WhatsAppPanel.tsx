import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Search, Send, Paperclip, Smile, Phone, Video, MoreVertical,
  MessageCircle, Users, Clock, CheckCheck, Check,
  FileText, Image as ImageIcon, Calendar, Bell, Megaphone,
  ChevronDown, Star, Pin
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePatientStore } from '@/store/usePatientStore';
import { useAuthStore } from '@/store/useAuthStore';
import type { Patient } from '@/types';

// Types
interface Message {
  id: string;
  text: string;
  timestamp: string;
  sender: 'clinic' | 'patient';
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'template';
  templateName?: string;
}

interface ChatContact {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  isOnline: boolean;
}

// Quick templates for dental clinics
const TEMPLATES = [
  { id: 'appt-reminder', name: 'Appointment Reminder', icon: Calendar, 
    text: 'Hello {name}, this is a reminder for your dental appointment on {date} at {time}. Please arrive 10 minutes early. Reply CONFIRM to confirm or RESCHEDULE to change your slot.' },
  { id: 'follow-up', name: 'Follow-up Check', icon: Bell,
    text: 'Hi {name}, it\'s been a week since your last visit. How are you feeling? If you have any concerns about your treatment, please don\'t hesitate to reach out. We\'re here to help!' },
  { id: 'treatment-complete', name: 'Treatment Complete', icon: CheckCheck,
    text: 'Dear {name}, your treatment has been completed successfully. Please follow the aftercare instructions provided by your doctor. Schedule your next follow-up visit within 2 weeks.' },
  { id: 'billing', name: 'Billing Reminder', icon: FileText,
    text: 'Hi {name}, this is a reminder regarding your pending balance of ₹{amount}. Please visit the clinic or use our online payment portal to clear your dues. Thank you!' },
  { id: 'happy-birthday', name: 'Happy Birthday', icon: Star,
    text: 'Happy Birthday, {name}! 🎂 Wishing you a wonderful year ahead with a bright and healthy smile. As a birthday gift, enjoy 10% off on your next dental visit!' },
];

export const WhatsAppPanel: React.FC = () => {
  const { user } = useAuthStore();
  const { patientsList, loadAllPatients } = usePatientStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [conversations, setConversations] = useState<Record<string, Message[]>>({});
  const [showTemplates, setShowTemplates] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAllPatients();
  }, [loadAllPatients]);

  // Convert patients to chat contacts
  const contacts: ChatContact[] = useMemo(() => {
    return patientsList.map((p: Patient) => {
      const msgs = conversations[p.id] || [];
      const lastMsg = msgs[msgs.length - 1];
      return {
        id: p.id,
        name: p.name,
        phone: p.phone || '',
        lastMessage: lastMsg?.text || 'No messages yet',
        lastMessageTime: lastMsg?.timestamp || '',
        unread: msgs.filter(m => m.sender === 'patient' && m.status !== 'read').length,
        isOnline: Math.random() > 0.7, // Simulated for UI
      };
    });
  }, [patientsList, conversations]);

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  const selectedContact = contacts.find(c => c.id === selectedContactId);
  const currentMessages = selectedContactId ? (conversations[selectedContactId] || []) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages.length]);

  const sendMessage = (text: string, type: 'text' | 'template' = 'text', templateName?: string) => {
    if (!text.trim() || !selectedContactId) return;

    const textToSend = text.replace('{name}', selectedContact?.name || 'Patient');

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      sender: 'clinic',
      status: 'sent',
      type,
      templateName,
    };

    setConversations(prev => ({
      ...prev,
      [selectedContactId]: [...(prev[selectedContactId] || []), newMsg],
    }));
    setMessageInput('');
    setShowTemplates(false);

    // Redirect to wa.me
    if (selectedContact?.phone) {
      let phoneNum = selectedContact.phone.replace(/[^\d+]/g, '');
      if (!phoneNum.startsWith('+') && !phoneNum.startsWith('91') && phoneNum.length === 10) {
        phoneNum = '91' + phoneNum;
      }
      const encodedMsg = encodeURIComponent(textToSend);
      window.open(`https://wa.me/${phoneNum.replace('+', '')}?text=${encodedMsg}`, '_blank');
    }

    // Simulate delivery status update
    setTimeout(() => {
      setConversations(prev => ({
        ...prev,
        [selectedContactId]: (prev[selectedContactId] || []).map(m =>
          m.id === newMsg.id ? { ...m, status: 'delivered' } : m
        ),
      }));
    }, 1500);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(messageInput);
  };

  const handleTemplateSelect = (template: typeof TEMPLATES[0]) => {
    sendMessage(template.text, 'template', template.name);
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    return time;
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      
      {/* Left: Contact List */}
      <div className="w-full max-w-[340px] border-r border-slate-200 flex flex-col bg-white">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <h2 className="font-black text-sm text-slate-800">WhatsApp Business</h2>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Megaphone className="w-4 h-4 text-slate-500" />
              </button>
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <MoreVertical className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 rounded-lg border-slate-200 text-sm bg-white"
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-medium">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              No patients found
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => setSelectedContactId(contact.id)}
                className={`w-full text-left p-3.5 flex items-start gap-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${
                  selectedContactId === contact.id ? 'bg-emerald-50 border-l-2 border-l-emerald-500' : ''
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-sm text-slate-600">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  {contact.isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-800 truncate">{contact.name}</span>
                    <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">
                      {formatTime(contact.lastMessageTime)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-slate-500 truncate pr-2">{contact.lastMessage}</p>
                    {contact.unread > 0 && (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {contact.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-sm text-slate-600">
                    {selectedContact.name.charAt(0).toUpperCase()}
                  </div>
                  {selectedContact.isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">{selectedContact.name}</h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {selectedContact.isOnline ? 'Online' : 'Last seen recently'} • {selectedContact.phone}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <Phone className="w-4 h-4 text-slate-500" />
                </button>
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <Video className="w-4 h-4 text-slate-500" />
                </button>
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <Search className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23e2e8f0\' fill-opacity=\'0.2\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
              {currentMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-600">Start a conversation</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Send an appointment reminder, follow-up message, or use a template to get started.
                  </p>
                  <button
                    onClick={() => setShowTemplates(true)}
                    className="mt-4 px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors cursor-pointer"
                  >
                    Use a Template
                  </button>
                </div>
              ) : (
                currentMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'clinic' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm ${
                        msg.sender === 'clinic'
                          ? 'bg-emerald-100 text-slate-800 rounded-br-md'
                          : 'bg-white text-slate-800 rounded-bl-md border border-slate-100'
                      }`}
                    >
                      {msg.type === 'template' && msg.templateName && (
                        <div className="text-[10px] font-bold text-emerald-600 mb-1 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {msg.templateName}
                        </div>
                      )}
                      <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                        {msg.sender === 'clinic' && (
                          msg.status === 'read' ? <CheckCheck className="w-3.5 h-3.5 text-blue-500" /> :
                          msg.status === 'delivered' ? <CheckCheck className="w-3.5 h-3.5 text-slate-400" /> :
                          <Check className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Templates Panel */}
            {showTemplates && (
              <div className="border-t border-slate-200 bg-slate-50 p-4 max-h-[280px] overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider">Quick Templates</h4>
                  <button onClick={() => setShowTemplates(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer">
                    Close
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className="w-full text-left p-3 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-200 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <template.icon className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-700">{template.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{template.text}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="px-4 py-3 border-t border-slate-200 bg-white">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Quick Templates"
                >
                  <FileText className="w-5 h-5 text-slate-400" />
                </button>
                <button type="button" className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
                  <Paperclip className="w-5 h-5 text-slate-400" />
                </button>
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 h-10 rounded-xl border-slate-200 text-sm"
                />
                <button type="button" className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
                  <Smile className="w-5 h-5 text-slate-400" />
                </button>
                <Button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="h-10 w-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white p-0 flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/30">
            <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center mb-6">
              <MessageCircle className="w-12 h-12 text-emerald-300" />
            </div>
            <h3 className="text-lg font-black text-slate-700">WhatsApp Business</h3>
            <p className="text-sm text-slate-400 mt-2 max-w-sm leading-relaxed">
              Send appointment reminders, follow-up messages, and treatment updates to your patients directly from the clinic dashboard.
            </p>
            <p className="text-[10px] text-slate-300 mt-6 font-bold uppercase tracking-wider">
              Select a patient from the list to start messaging
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppPanel;
