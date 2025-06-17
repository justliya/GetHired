const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: functions.config().email.user,
    pass: functions.config().email.password
  }
});

exports.sendJobNotificationEmail = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
    return;
  }

  try {
    const { to, user_name, jobs, total_jobs, search_preferences, email_type } = req.body;

    if (!to || !jobs || !user_name) {
      res.status(400).json({ error: 'Missing required fields: to, user_name, jobs' });
      return;
    }

    // Generate email content based on type
    let subject, htmlContent;
    
    if (email_type === 'scheduled_search_results') {
      subject = `🎯 ${jobs.length} New Job Opportunities Found!`;
      htmlContent = generateScheduledSearchEmail(user_name, jobs, total_jobs, search_preferences);
    } else {
      subject = `GetHired: Job Search Results`;
      htmlContent = generateGenericJobEmail(user_name, jobs);
    }

    const mailOptions = {
      from: functions.config().email.user,
      to: to,
      subject: subject,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    
    res.status(200).json({ 
      success: true, 
      message: 'Email sent successfully',
      jobCount: jobs.length 
    });

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      error: 'Failed to send email', 
      details: error.message 
    });
  }
});

/**
 * Generate HTML email content for scheduled search results
 */
function generateScheduledSearchEmail(userName, jobs, totalJobs, searchPreferences) {
  const jobsHtml = jobs.map(job => `
    <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 16px; background-color: #ffffff;">
      <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 18px;">
        <a href="${job.url || '#'}" style="color: #3b82f6; text-decoration: none;">${job.title}</a>
      </h3>
      <p style="margin: 4px 0; color: #6b7280; font-weight: 600;">${job.company}</p>
      <p style="margin: 4px 0; color: #6b7280;">${job.location || 'Location not specified'}</p>
      ${job.salary ? `<p style="margin: 4px 0; color: #059669; font-weight: 600;">${job.salary}</p>` : ''}
      <p style="margin: 8px 0 0 0; color: #374151; line-height: 1.5;">
        ${job.description ? job.description.substring(0, 200) + '...' : 'No description available'}
      </p>
      <div style="margin-top: 12px;">
        <a href="${job.url || '#'}" 
           style="background-color: #3b82f6; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: 600; display: inline-block;">
          View Job
        </a>
      </div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>GetHired - Job Search Results</title>
    </head>
    <body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold;">🎯 New Job Opportunities!</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">Your scheduled job search found ${totalJobs} ${totalJobs === 1 ? 'match' : 'matches'}</p>
        </div>

        <!-- Content -->
        <div style="padding: 24px;">
          <p style="margin: 0 0 16px 0; font-size: 16px;">Hi ${userName},</p>
          
          <p style="margin: 0 0 24px 0; color: #6b7280;">
            Great news! Your scheduled job search has found ${totalJobs} new job ${totalJobs === 1 ? 'opportunity' : 'opportunities'} 
            matching your preferences. Here ${jobs.length === 1 ? 'is' : 'are'} the top ${Math.min(jobs.length, 10)} ${jobs.length === 1 ? 'result' : 'results'}:
          </p>

          <!-- Job Listings -->
          <div style="margin-bottom: 24px;">
            ${jobsHtml}
          </div>

          ${totalJobs > jobs.length ? `
            <div style="text-align: center; margin: 24px 0; padding: 16px; background-color: #f3f4f6; border-radius: 8px;">
              <p style="margin: 0; color: #6b7280;">
                Showing ${jobs.length} of ${totalJobs} jobs found. 
                <a href="https://gethired.app/dashboard" style="color: #3b82f6; text-decoration: none; font-weight: 600;">
                  View all results →
                </a>
              </p>
            </div>
          ` : ''}

          <!-- Search Preferences Summary -->
          <div style="margin: 24px 0; padding: 16px; background-color: #f8fafc; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <h4 style="margin: 0 0 8px 0; color: #1f2937;">Your Search Criteria:</h4>
            <ul style="margin: 0; padding-left: 16px; color: #6b7280;">
              ${searchPreferences.titles ? `<li>Roles: ${searchPreferences.titles.join(', ')}</li>` : ''}
              ${searchPreferences.locations ? `<li>Locations: ${searchPreferences.locations.join(', ')}</li>` : ''}
              ${searchPreferences.jobType ? `<li>Job Type: ${searchPreferences.jobType}</li>` : ''}
              ${searchPreferences.seniority ? `<li>Seniority: ${searchPreferences.seniority}</li>` : ''}
            </ul>
          </div>

          <!-- Call to Action -->
          <div style="text-align: center; margin: 24px 0;">
            <a href="https://gethired.app/dashboard" 
               style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;">
              View All Jobs on Dashboard
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            This is an automated email from your GetHired scheduled job search.
          </p>
          <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">
            <a href="https://gethired.app/settings" style="color: #3b82f6; text-decoration: none;">
              Manage your search preferences
            </a> | 
            <a href="https://gethired.app/unsubscribe" style="color: #6b7280; text-decoration: none;">
              Unsubscribe
            </a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate HTML email content for generic job notifications
 */
function generateGenericJobEmail(userName, jobs) {
  const jobsHtml = jobs.slice(0, 5).map(job => `
    <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <h3 style="margin: 0 0 8px 0; color: #1f2937;">
        <a href="${job.url || '#'}" style="color: #3b82f6; text-decoration: none;">${job.title}</a>
      </h3>
      <p style="margin: 4px 0; color: #6b7280; font-weight: 600;">${job.company}</p>
      <p style="margin: 4px 0; color: #6b7280;">${job.location || 'Location not specified'}</p>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #3b82f6; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="margin: 0;">GetHired Job Results</h1>
      </div>
      
      <p>Hi ${userName},</p>
      
      <p>Here are your job search results:</p>
      
      ${jobsHtml}
      
      <div style="text-align: center; margin-top: 20px;">
        <a href="https://gethired.app/dashboard" 
           style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
          View More Jobs
        </a>
      </div>
      
      <p style="margin-top: 20px; font-size: 12px; color: #666;">
        This email was sent by GetHired. 
        <a href="https://gethired.app/unsubscribe">Unsubscribe</a>
      </p>
    </body>
    </html>
  `;
}
