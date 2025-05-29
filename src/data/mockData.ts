import type { JobListing, CompanyResearch, ResumeTailoring } from '../types/index';

export const mockJobListings: JobListing[] = [
  {
    id: '1',
    title: 'Senior Frontend Developer',
    company: 'TechCorp',
    location: 'San Francisco, CA',
    salary: '$120,000 - $150,000',
    description: 'TechCorp is seeking a Senior Frontend Developer to join our growing team. You will be responsible for building user interfaces for our enterprise products using React and TypeScript.',
    qualifications: [
      'Proven experience with React and TypeScript',
      '5+ years of frontend development experience',
      'Experience with state management libraries',
      'Understanding of accessibility standards'
    ],
    datePosted: '2023-08-15',
    url: 'https://example.com/job/1',
    favorite: true,
    status: 'researching'
  },
  {
    id: '2',
    title: 'Full Stack Engineer',
    company: 'InnovateSoft',
    location: 'Remote',
    salary: '$110,000 - $140,000',
    description: 'Join our dynamic team as a Full Stack Engineer, working on cutting-edge web applications. You will be contributing to both frontend and backend development using modern technologies.',
    qualifications: [
      'Strong JavaScript skills',
      'Experience with React and Node.js',
      'Knowledge of SQL and NoSQL databases',
      'Experience with cloud services (AWS, GCP, or Azure)'
    ],
    datePosted: '2023-08-10',
    url: 'https://example.com/job/2',
    favorite: false,
    status: 'new'
  },
  {
    id: '3',
    title: 'UI/UX Designer',
    company: 'DesignHub',
    location: 'New York, NY',
    salary: '$90,000 - $120,000',
    description: 'DesignHub is looking for a talented UI/UX Designer to create beautiful, intuitive interfaces for our clients. You will work closely with developers and product managers to deliver outstanding user experiences.',
    qualifications: [
      'Portfolio demonstrating UI/UX design skills',
      'Proficiency in Figma or similar design tools',
      'Understanding of user-centered design principles',
      'Experience with design systems'
    ],
    datePosted: '2023-08-05',
    url: 'https://example.com/job/3',
    favorite: true,
    status: 'applying'
  },
  {
    id: '4',
    title: 'DevOps Engineer',
    company: 'CloudScale',
    location: 'Austin, TX',
    salary: '$130,000 - $160,000',
    description: 'CloudScale is seeking a DevOps Engineer to help us build and maintain our infrastructure. You will be responsible for CI/CD pipelines, infrastructure as code, and ensuring high availability of our services.',
    qualifications: [
      'Experience with containerization (Docker, Kubernetes)',
      'Knowledge of infrastructure as code (Terraform, CloudFormation)',
      'Experience with CI/CD pipelines',
      'Understanding of cloud services (AWS, GCP, or Azure)'
    ],
    datePosted: '2023-08-01',
    url: 'https://example.com/job/4',
    favorite: false,
    status: 'applied'
  },
  {
    id: '5',
    title: 'Data Scientist',
    company: 'DataInsights',
    location: 'Remote',
    salary: '$125,000 - $155,000',
    description: 'DataInsights is looking for a Data Scientist to join our team. You will be responsible for analyzing large datasets, building machine learning models, and deriving actionable insights for our clients.',
    qualifications: [
      'Strong background in statistics and mathematics',
      'Experience with Python and data science libraries',
      'Knowledge of machine learning algorithms',
      'Experience with big data technologies'
    ],
    datePosted: '2023-07-25',
    url: 'https://example.com/job/5',
    favorite: true,
    status: 'interviewing'
  }
];

export const mockCompanyResearch: CompanyResearch[] = [
  {
    id: '1',
    jobId: '1',
    companyName: 'TechCorp',
    officialWebsite: 'https://techcorp-example.com',
    responsibilities: [
      'Develop and maintain frontend applications using React and TypeScript',
      'Collaborate with UI/UX designers to implement responsive designs',
      'Optimize applications for maximum speed and scalability',
      'Participate in code reviews and mentor junior developers'
    ],
    benefits: [
      'Comprehensive health insurance',
      'Flexible work hours',
      '401(k) matching',
      'Professional development budget',
      'Unlimited PTO'
    ],
    pros: [
      'Great work-life balance',
      'Collaborative team culture',
      'Latest technologies and tools',
      'Clear career progression'
    ],
    cons: [
      'Fast-paced environment can be stressful at times',
      'Some legacy code to maintain',
      'Occasional weekend deployments'
    ],
    glassdoorLink: 'https://glassdoor.com/techcorp-example',
    notes: 'Company seems to have a strong culture and good benefits. Worth applying.'
  },
  {
    id: '3',
    jobId: '3',
    companyName: 'DesignHub',
    officialWebsite: 'https://designhub-example.com',
    responsibilities: [
      'Create wireframes, mockups, and prototypes for web and mobile applications',
      'Conduct user research and usability testing',
      'Develop and maintain design systems',
      'Collaborate with developers to ensure proper implementation'
    ],
    benefits: [
      'Health and dental insurance',
      'Remote work options',
      'Creative environment',
      'Design tool subscriptions',
      'Professional development opportunities'
    ],
    pros: [
      'Creative freedom',
      'Diverse client projects',
      'Supportive leadership',
      'Regular design showcases'
    ],
    cons: [
      'Tight deadlines',
      'Multiple revisions can be frustrating',
      'Client expectations sometimes unrealistic'
    ],
    glassdoorLink: 'https://glassdoor.com/designhub-example',
    notes: 'Company has excellent reputation in the design community. Portfolio of work is impressive.'
  }
];

export const mockResumeTailoring: ResumeTailoring[] = [
  {
    id: '1',
    jobId: '1',
    suggestedChanges: [
      {
        section: 'Skills',
        original: 'React, JavaScript, CSS, HTML',
        suggested: 'React, TypeScript, CSS-in-JS, HTML5, Accessibility',
        reason: 'The job description emphasizes TypeScript experience and accessibility knowledge.'
      },
      {
        section: 'Experience',
        original: 'Developed web applications using React and JavaScript',
        suggested: 'Developed enterprise-grade web applications using React and TypeScript with a focus on performance optimization and accessibility standards',
        reason: 'Aligns better with the senior-level position and highlights specific requirements mentioned in the job description.'
      }
    ],
    coverLetter: `Dear Hiring Manager,

I am writing to express my interest in the Senior Frontend Developer position at TechCorp. With over 5 years of experience building modern web applications using React and TypeScript, I believe I would be a valuable addition to your team.

Throughout my career, I have focused on creating responsive, accessible, and performant user interfaces. In my current role at XYZ Company, I led the development of our component library, which improved development efficiency by 30% and ensured consistent design across our products.

I am particularly drawn to TechCorp's mission of creating intuitive enterprise software solutions. I share your commitment to user-centered design and would be excited to contribute to your team.

Thank you for considering my application. I look forward to the opportunity to discuss how my skills and experience align with your needs.

Sincerely,
[Your Name]`
  }
];