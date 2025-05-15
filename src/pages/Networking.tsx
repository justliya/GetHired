import React, { useState } from 'react';
import { Search, Users, Mail, MessageCircle, Link2, UserPlus, RefreshCw,Building2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const Networking: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedContact, setSelectedContact] = useState<number | null>(null);
  const [messageType, setMessageType] = useState<string>('introduction');
  const [company, setCompany] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState<string>('');
  
  // Mock contacts for demonstration
  const [contacts, setContacts] = useState<{
    id: number;
    name: string;
    title: string;
    company: string;
    connectionDegree: 1 | 2 | 3;
    imgUrl: string;
    mutualConnections?: number;
  }[]>([]);

  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    setSelectedContact(null);
    setGeneratedMessage('');
    
    // Simulate search delay
    setTimeout(() => {
      setContacts([
        {
          id: 1,
          name: "Sarah Johnson",
          title: "Senior Product Manager",
          company: "TechCorp Inc.",
          connectionDegree: 2,
          imgUrl: "https://randomuser.me/api/portraits/women/44.jpg",
          mutualConnections: 3,
        },
        {
          id: 2,
          name: "Michael Chen",
          title: "Engineering Director",
          company: "InnovateSoft",
          connectionDegree: 1,
          imgUrl: "https://randomuser.me/api/portraits/men/32.jpg",
        },
        {
          id: 3,
          name: "Elena Rodriguez",
          title: "Tech Recruiter",
          company: "TalentHub",
          connectionDegree: 2,
          imgUrl: "https://randomuser.me/api/portraits/women/68.jpg",
          mutualConnections: 1,
        },
        {
          id: 4,
          name: "David Wilson",
          title: "CTO",
          company: "StartupX",
          connectionDegree: 3,
          imgUrl: "https://randomuser.me/api/portraits/men/75.jpg",
        },
      ]);
      setIsSearching(false);
    }, 1500);
  };

  const handleSelectContact = (id: number) => {
    setSelectedContact(id);
    setGeneratedMessage('');
    const contact = contacts.find(c => c.id === id);
    if (contact) {
      setCompany(contact.company);
    }
  };

  const handleGenerateMessage = () => {
    if (!selectedContact) return;
    
    setIsGenerating(true);
    
    // Simulate message generation delay
    setTimeout(() => {
      const contact = contacts.find(c => c.id === selectedContact);
      
      let message = '';
      if (messageType === 'introduction') {
        message = `Hi ${contact?.name},\n\nI hope this message finds you well. I noticed your profile and was impressed by your experience as ${contact?.title} at ${contact?.company}. I'm currently exploring opportunities in this field and would appreciate the chance to connect and learn more about your career journey.\n\nThank you for considering my connection request.\n\nBest regards,\n[Your Name]`;
      } else if (messageType === 'referral') {
        message = `Hi ${contact?.name},\n\nI hope you're doing well. I'm reaching out because I'm interested in the open positions at ${company || contact?.company} and was wondering if you might be open to referring me. I've attached my resume and would be grateful for any advice or insights you could share about the company culture and application process.\n\nThank you for your time and consideration.\n\nBest regards,\n[Your Name]`;
      } else if (messageType === 'informational') {
        message = `Hi ${contact?.name},\n\nI hope this message finds you well. I'm currently exploring career opportunities in ${company || contact?.company}'s industry and am particularly interested in learning more about your role as ${contact?.title}.\n\nWould you be open to a brief 15-minute conversation where I could ask you a few questions about your professional experience? I'd greatly appreciate any insights you might be willing to share.\n\nThank you for considering my request.\n\nBest regards,\n[Your Name]`;
      }
      
      setGeneratedMessage(message);
      setIsGenerating(false);
    }, 2000);
  };

  const getConnectionBadge = (degree: 1 | 2 | 3) => {
    switch (degree) {
      case 1:
        return <span className="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full">1st</span>;
      case 2:
        return <span className="bg-secondary-100 text-secondary-700 text-xs px-2 py-0.5 rounded-full">2nd</span>;
      case 3:
        return <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">3rd</span>;
    }
  };

  const selectedContactData = selectedContact 
    ? contacts.find(c => c.id === selectedContact)
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-2 relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search size={18} className="text-gray-500" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="Search by name, company, or job title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <Button
              variant="primary"
              className="w-full"
              disabled={!searchTerm.trim() || isSearching}
              onClick={handleSearch}
            >
              {isSearching ? (
                <>
                  <RefreshCw size={18} className="mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Users size={18} className="mr-2" />
                  Find Connections
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {contacts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Potential Connections</h3>
            <div className="space-y-3">
              {contacts.map((contact) => (
                <button
                  key={contact.id}
                  className={`w-full text-left rounded-lg border transition-colors ${
                    selectedContact === contact.id
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => handleSelectContact(contact.id)}
                >
                  <div className="p-3 flex items-center">
                    <img 
                      src={contact.imgUrl} 
                      alt={contact.name} 
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="ml-3">
                      <div className="flex items-center">
                        <h4 className="font-medium text-gray-900">{contact.name}</h4>
                        <div className="ml-2">{getConnectionBadge(contact.connectionDegree)}</div>
                      </div>
                      <p className="text-sm text-gray-600">{contact.title}</p>
                      <p className="text-xs text-gray-500">{contact.company}</p>
                      {contact.mutualConnections && (
                        <p className="text-xs text-primary-600 mt-1">
                          {contact.mutualConnections} mutual connection{contact.mutualConnections !== 1 && 's'}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          <div className="md:col-span-2">
            {selectedContactData ? (
              <Card className="h-full">
                <div className="flex flex-col md:flex-row md:items-center mb-6">
                  <img 
                    src={selectedContactData.imgUrl} 
                    alt={selectedContactData.name} 
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div className="mt-4 md:mt-0 md:ml-4">
                    <div className="flex items-center">
                      <h3 className="text-xl font-semibold text-gray-900">{selectedContactData.name}</h3>
                      <div className="ml-2">{getConnectionBadge(selectedContactData.connectionDegree)}</div>
                    </div>
                    <p className="text-gray-600">{selectedContactData.title}</p>
                    <div className="flex items-center text-gray-500 text-sm mt-1">
                      <Building2 size={14} className="mr-1" />
                      {selectedContactData.company}
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0 md:ml-auto">
                    <Button 
                      variant={selectedContactData.connectionDegree === 1 ? "outline" : "primary"} 
                      size="sm"
                      icon={selectedContactData.connectionDegree === 1 ? <MessageCircle size={16} /> : <UserPlus size={16} />}
                    >
                      {selectedContactData.connectionDegree === 1 ? "Message" : "Connect"}
                    </Button>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800 mb-3">Generate Outreach Message</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Message Type
                      </label>
                      <select
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        value={messageType}
                        onChange={(e) => setMessageType(e.target.value)}
                      >
                        <option value="introduction">Introduction Request</option>
                        <option value="referral">Job Referral Request</option>
                        <option value="informational">Informational Interview</option>
                      </select>
                    </div>
                    
                    {messageType === 'referral' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Company
                        </label>
                        <input
                          type="text"
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Company name"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                  
                  <Button
                    variant="primary"
                    className="w-full mb-4"
                    disabled={isGenerating}
                    onClick={handleGenerateMessage}
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw size={18} className="mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Mail size={18} className="mr-2" />
                        Generate Message
                      </>
                    )}
                  </Button>
                  
                  {generatedMessage && (
                    <div className="mt-4 animate-fade-in">
                      <div className="bg-gray-50 rounded-lg p-4 relative">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                          {generatedMessage}
                        </pre>
                        <div className="absolute top-2 right-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            icon={<Link2 size={14} />}
                            className="text-primary-600"
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Remember to personalize this message before sending it to make it more authentic.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg p-8 text-center">
                <div>
                  <Users size={48} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Select a contact</h3>
                  <p className="text-gray-500">Choose someone from the list to view their profile and generate a message</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Networking;