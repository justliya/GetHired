"""
MailChimp email service for sending job notification emails
"""
import os
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path
import mailchimp_marketing as MailchimpMarketing
from mailchimp_marketing.api_client import ApiClientError
from datetime import datetime

logger = logging.getLogger(__name__)

class MailChimpService:
    """Service for handling MailChimp email campaigns and sending job notifications"""
    
    def __init__(self):
        self.api_key = os.getenv('MAILCHIMP_API_KEY')
        self.server_prefix = os.getenv('MAILCHIMP_SERVER_PREFIX') 
        self.list_id = os.getenv('MAILCHIMP_LIST_ID')
        
        if not all([self.api_key, self.server_prefix, self.list_id]):
            logger.warning("MailChimp configuration incomplete. Email sending will be disabled.")
            self.client = None
            return
            
        self.client = MailchimpMarketing.Client()
        self.client.set_config({
            "api_key": self.api_key,
            "server": self.server_prefix
        })
        
        # Load email templates
        self.templates = self._load_email_templates()
        
    def _load_email_templates(self) -> Dict[str, str]:
        """Load all HTML email templates from the email-templates directory"""
        templates: Dict[str, str] = {}
        templates_dir = Path(__file__).parent.parent / "email-templates"
        
        if not templates_dir.exists():
            logger.warning("Email templates directory not found: %s", templates_dir)
            return templates
            
        for template_file in templates_dir.glob("*.html"):
            template_name = template_file.stem
            try:
                with open(template_file, 'r', encoding='utf-8') as f:
                    templates[template_name] = f.read()
                logger.info("Loaded email template: %s", template_name)
            except IOError as e:
                logger.error("Failed to load template %s: %s", template_file, str(e))
                
        return templates
        
    def _select_template(self, job_count: int) -> str:
        """Select appropriate email template based on job count"""
        if job_count >= 10:
            return "template-executive-digest"  # For high-volume results
        elif job_count >= 5:
            return "template-weekly-spotlight"  # For moderate results
        elif job_count >= 3:
            return "template-modern-cards"  # For few but good results
        elif job_count >= 1:
            return "template-hero-banner"  # For single/couple jobs
        else:
            return "template-minimal-professional"  # For no results
            
    def _render_template(self, template_content: str, context: Dict[str, Any]) -> str:
        """Render email template with context data using simple string replacement"""
        try:
            # Replace Handlebars-style variables with actual values
            rendered = template_content
            
            # Replace user data
            rendered = rendered.replace('{{user_name}}', context.get('user_name', 'Job Seeker'))
            rendered = rendered.replace('{{user_email}}', context.get('user_email', ''))
            
            # Replace job data
            jobs = context.get('jobs', [])
            job_count = len(jobs)
            rendered = rendered.replace('{{job_count}}', str(job_count))
            rendered = rendered.replace('{{total_jobs}}', str(context.get('total_jobs', job_count)))
            
            # Generate job listings HTML
            job_html = self._generate_job_listings_html(jobs)
            rendered = rendered.replace('{{#each jobs}}{{> job_listing}}{{/each}}', job_html)
            rendered = rendered.replace('{{job_listings}}', job_html)
            
            # Replace search preferences
            search_prefs = context.get('search_preferences', {})
            rendered = rendered.replace('{{search_criteria}}', self._format_search_criteria(search_prefs))
            
            # Replace dates
            rendered = rendered.replace('{{current_date}}', datetime.now().strftime('%B %d, %Y'))
            rendered = rendered.replace('{{current_year}}', str(datetime.now().year))
            
            return rendered
            
        except Exception as e:
            logger.error("Error rendering template: %s", str(e))
            return self._generate_fallback_email(context)
            
    def _generate_job_listings_html(self, jobs: List[Dict[str, Any]]) -> str:
        """Generate HTML for job listings"""
        if not jobs:
            return '<p style="text-align: center; color: #6b7280;">No new jobs found this time, but keep checking back!</p>'
            
        job_html = ""
        for job in jobs[:10]:  # Limit to 10 jobs
            job_html += f"""
            <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 16px; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <h3 style="margin: 0; color: #1f2937; font-size: 18px; font-weight: 600;">
                        <a href="{job.get('url', '#')}" style="color: #3b82f6; text-decoration: none;">{job.get('title', 'Job Title')}</a>
                    </h3>
                    <span style="background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 500;">
                        {job.get('match_score', 'N/A')}% Match
                    </span>
                </div>
                <div style="margin-bottom: 12px;">
                    <p style="margin: 0; color: #374151; font-weight: 600; font-size: 16px;">{job.get('company', 'Company Name')}</p>
                    <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">📍 {job.get('location', 'Location not specified')}</p>
                </div>
                <div style="margin-bottom: 16px;">
                    <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.5;">
                        {job.get('description', '')[:200]}{'...' if len(job.get('description', '')) > 200 else ''}
                    </p>
                </div>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <a href="{job.get('url', '#')}" style="background: #3b82f6; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
                        View Job
                    </a>
                    <span style="color: #6b7280; font-size: 12px;">
                        💰 {job.get('salary', 'Salary not specified')}
                    </span>
                </div>
            </div>
            """
            
        return job_html
        
    def _format_search_criteria(self, search_prefs: Dict[str, Any]) -> str:
        """Format search criteria for display"""
        criteria_parts = []
        
        if search_prefs.get('titles'):
            criteria_parts.append(f"Roles: {', '.join(search_prefs['titles'])}")
        if search_prefs.get('locations'):
            criteria_parts.append(f"Locations: {', '.join(search_prefs['locations'])}")
        if search_prefs.get('skills'):
            criteria_parts.append(f"Skills: {', '.join(search_prefs['skills'])}")
        if search_prefs.get('jobType'):
            criteria_parts.append(f"Type: {search_prefs['jobType']}")
            
        return " | ".join(criteria_parts) if criteria_parts else "All jobs"
        
    def _generate_fallback_email(self, context: Dict[str, Any]) -> str:
        """Generate a simple fallback email if template rendering fails"""
        user_name = context.get('user_name', 'Job Seeker')
        jobs = context.get('jobs', [])
        job_count = len(jobs)
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>GetHired - Job Search Results</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #3b82f6;">🎯 GetHired</h1>
                <h2>Hello {user_name}!</h2>
                <p>We found {job_count} job opportunities for you.</p>
            </div>
            
            <div style="margin: 20px 0;">
                {self._generate_job_listings_html(jobs)}
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 8px;">
                <p>This is an automated email from your GetHired scheduled job search.</p>
                <p><a href="https://gethired.app" style="color: #3b82f6;">Visit GetHired Dashboard</a></p>
            </div>
        </body>
        </html>
        """
        return html
        
    async def send_job_notification_email(
        self,
        user_email: str,
        user_name: str,
        jobs: List[Dict[str, Any]],
        search_preferences: Dict[str, Any],
        template_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send job notification email using MailChimp
        
        Args:
            user_email: Recipient email address
            user_name: Recipient name
            jobs: List of job objects
            search_preferences: User's search preferences
            template_name: Optional specific template to use
            
        Returns:
            Dict with success status and details
        """
        if not self.client:
            logger.error("MailChimp client not configured")
            return {
                "success": False,
                "error": "MailChimp not configured"
            }
            
        try:
            job_count = len(jobs)
            
            # Select template
            if not template_name:
                template_name = self._select_template(job_count)
                
            template_content = self.templates.get(template_name)
            if not template_content:
                logger.warning("Template '%s' not found, using fallback", template_name)
                template_content = None
                
            # Prepare template context
            context = {
                'user_name': user_name,
                'user_email': user_email,
                'jobs': jobs,
                'job_count': job_count,
                'total_jobs': job_count,
                'search_preferences': search_preferences,
                'current_date': datetime.now().strftime('%B %d, %Y'),
                'current_year': datetime.now().year
            }
            
            # Render email content
            if template_content:
                html_content = self._render_template(template_content, context)
            else:
                html_content = self._generate_fallback_email(context)
                
            # Create email subject
            if job_count > 0:
                subject = f"🎯 {job_count} New Job{'s' if job_count != 1 else ''} Found - GetHired"
            else:
                subject = "GetHired - No New Jobs This Time"
                
            # Create campaign
            campaign_data = {
                "type": "regular",
                "recipients": {
                    "list_id": self.list_id
                },
                "settings": {
                    "subject_line": subject,
                    "from_name": "GetHired",
                    "reply_to": "noreply@gethired.app",
                    "title": f"Job Search Results for {user_name} - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
                }
            }
            
            # Create the campaign
            campaign = self.client.campaigns.create(campaign_data)
            campaign_id = campaign["id"]
            
            # Set campaign content
            content_data = {
                "html": html_content
            }
            
            self.client.campaigns.set_content(campaign_id, content_data)
            
            # Send to specific email (if user is not in list, add them temporarily)
            try:
                # Check if user exists in list
                try:
                    self.client.lists.get_list_member(
                        self.list_id, 
                        user_email
                    )
                except ApiClientError as e:
                    if "404" in str(e):
                        # User not in list, add them
                        member_data = {
                            "email_address": user_email,
                            "status": "subscribed",
                            "merge_fields": {
                                "FNAME": user_name.split()[0] if user_name else "Friend",
                                "LNAME": " ".join(user_name.split()[1:]) if len(user_name.split()) > 1 else ""
                            }
                        }
                        self.client.lists.add_list_member(self.list_id, member_data)
                        logger.info("Added %s to MailChimp list", user_email)
                    else:
                        raise e
                        
                # Send the campaign
                self.client.campaigns.send(campaign_id)
                
                logger.info("Email sent successfully to %s via MailChimp campaign %s", user_email, campaign_id)
                
                return {
                    "success": True,
                    "campaign_id": campaign_id,
                    "recipient": user_email,
                    "job_count": job_count,
                    "template_used": template_name
                }
                
            except ApiClientError as send_error:
                logger.error("Failed to send MailChimp campaign: %s", str(send_error))
                return {
                    "success": False,
                    "error": f"Failed to send email: {str(send_error)}"
                }
                
        except Exception as e:
            logger.error("Error in MailChimp email service: %s", str(e))
            return {
                "success": False,
                "error": f"Email service error: {str(e)}"
            }
            
    async def test_connection(self) -> Dict[str, Any]:
        """Test MailChimp API connection"""
        if not self.client:
            return {
                "success": False,
                "error": "MailChimp client not configured"
            }
            
        try:
            # Test API connection
            account_info = self.client.account.get()
            
            # Test list access
            list_info = self.client.lists.get_list(self.list_id)
            
            return {
                "success": True,
                "account": account_info.get("account_name"),
                "list_name": list_info.get("name"),
                "member_count": list_info.get("stats", {}).get("member_count", 0),
                "templates_loaded": len(self.templates)
            }
            
        except Exception as e:
            logger.error("MailChimp connection test failed: %s", str(e))
            return {
                "success": False,
                "error": str(e)
            }
    
    def load_canva_template(self, template_url: str) -> str:
        """Load HTML template from Canva export or URL"""
        try:
            import requests
            response = requests.get(template_url, timeout=30)
            response.raise_for_status()
            return response.text
        except Exception as e:
            logger.error(f"Failed to load Canva template from {template_url}: {e}")
            return ""
    
    def _inject_job_listings_into_template(self, template_html: str, jobs: List[Dict[str, Any]]) -> str:
        """Enhanced job listing injection with multiple insertion points"""
        
        # Job listing HTML generation
        job_cards_html = self._generate_job_cards(jobs)
        job_list_html = self._generate_job_list(jobs)
        job_table_html = self._generate_job_table(jobs)
        
        # Multiple replacement patterns for different template styles
        replacements = {
            # Standard placeholders
            '{{JOB_LISTINGS}}': job_cards_html,
            '{{JOBS_LIST}}': job_list_html,
            '{{JOBS_TABLE}}': job_table_html,
            '{{JOB_COUNT}}': str(len(jobs)),
            
            # Canva-style placeholders (common export patterns)
            '[JOB_LISTINGS]': job_cards_html,
            '[JOBS_LIST]': job_list_html,
            '[JOB_COUNT]': str(len(jobs)),
            
            # Text content placeholders
            'REPLACE_WITH_JOBS': job_cards_html,
            'INSERT_JOBS_HERE': job_cards_html,
            'JOBS_PLACEHOLDER': job_cards_html,
            
            # Common template variables
            '{job_listings}': job_cards_html,
            '{jobs_list}': job_list_html,
            '{job_count}': str(len(jobs)),
            
            # Date placeholders
            '{{DATE}}': datetime.now().strftime('%B %d, %Y'),
            '{{CURRENT_DATE}}': datetime.now().strftime('%B %d, %Y'),
            '[DATE]': datetime.now().strftime('%B %d, %Y'),
        }
        
        modified_template = template_html
        for placeholder, replacement in replacements.items():
            modified_template = modified_template.replace(placeholder, replacement)
        
        # Handle dynamic job insertion for templates with job containers
        modified_template = self._handle_dynamic_job_containers(modified_template, jobs)
        
        return modified_template
    
    def _handle_dynamic_job_containers(self, template_html: str, jobs: List[Dict[str, Any]]) -> str:
        """Handle templates with dynamic job containers (repeat sections)"""
        import re
        
        # Pattern for job container sections that should be repeated
        container_pattern = r'<!--\s*JOB_CONTAINER_START\s*-->(.*?)<!--\s*JOB_CONTAINER_END\s*-->'
        
        def replace_job_container(match):
            container_template = match.group(1)
            job_html_parts = []
            
            for i, job in enumerate(jobs):
                job_html = container_template
                job_html = job_html.replace('{{JOB_TITLE}}', job.get('title', 'Unknown'))
                job_html = job_html.replace('{{JOB_COMPANY}}', job.get('company', 'Unknown'))
                job_html = job_html.replace('{{JOB_LOCATION}}', job.get('location', 'Remote'))
                job_html = job_html.replace('{{JOB_SALARY}}', job.get('salary', 'Competitive'))
                job_html = job_html.replace('{{JOB_DESCRIPTION}}', job.get('description', '')[:200] + '...')
                job_html = job_html.replace('{{JOB_URL}}', job.get('url', '#'))
                job_html = job_html.replace('{{JOB_INDEX}}', str(i + 1))
                job_html = job_html.replace('{{MATCH_SCORE}}', str(job.get('match_score', 80)))
                
                job_html_parts.append(job_html)
            
            return ''.join(job_html_parts)
        
        return re.sub(container_pattern, replace_job_container, template_html, flags=re.DOTALL)
    
    def _generate_job_cards(self, jobs: List[Dict[str, Any]]) -> str:
        """Generate modern job cards HTML"""
        cards_html = ['<div style="display: flex; flex-wrap: wrap; gap: 20px; margin: 20px 0;">']
        
        for job in jobs:
            card_html = f'''
            <div style="border: 1px solid #e1e5e9; border-radius: 12px; padding: 24px; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); flex: 1; min-width: 300px; max-width: 400px;">
                <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 12px;">
                    <h3 style="margin: 0; color: #1a1a1a; font-size: 18px; font-weight: 600;">{job.get('title', 'Unknown')}</h3>
                    <span style="background: #e8f5e8; color: #1a7a1a; padding: 4px 8px; border-radius: 16px; font-size: 12px; font-weight: 500;">{job.get('match_score', 80)}% Match</span>
                </div>
                <div style="margin-bottom: 16px;">
                    <p style="margin: 0 0 8px 0; color: #4a5568; font-weight: 500; font-size: 16px;">{job.get('company', 'Unknown Company')}</p>
                    <p style="margin: 0; color: #718096; font-size: 14px;">📍 {job.get('location', 'Remote')}</p>
                    <p style="margin: 8px 0 0 0; color: #059669; font-weight: 500; font-size: 14px;">💰 {job.get('salary', 'Competitive')}</p>
                </div>
                <p style="margin: 0 0 16px 0; color: #4a5568; font-size: 14px; line-height: 1.5;">{job.get('description', 'No description available.')[:150]}...</p>
                <a href="{job.get('url', '#')}" style="display: inline-block; background: #3182ce; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">View Job</a>
            </div>
            '''
            cards_html.append(card_html)
        
        cards_html.append('</div>')
        return ''.join(cards_html)
    
    def _generate_job_list(self, jobs: List[Dict[str, Any]]) -> str:
        """Generate simple job list HTML"""
        list_html = ['<div style="margin: 20px 0;">']
        
        for i, job in enumerate(jobs, 1):
            list_item = f'''
            <div style="border-bottom: 1px solid #e2e8f0; padding: 20px 0;">
                <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 8px;">
                    <h4 style="margin: 0; color: #2d3748; font-size: 18px; font-weight: 600;">{i}. {job.get('title', 'Unknown')}</h4>
                    <span style="color: #059669; font-weight: 500; font-size: 14px;">{job.get('match_score', 80)}% Match</span>
                </div>
                <p style="margin: 0 0 8px 0; color: #4a5568; font-weight: 500;">{job.get('company', 'Unknown')} • {job.get('location', 'Remote')}</p>
                <p style="margin: 0 0 12px 0; color: #059669; font-weight: 500;">{job.get('salary', 'Competitive')}</p>
                <p style="margin: 0 0 12px 0; color: #718096; font-size: 14px; line-height: 1.5;">{job.get('description', '')[:200]}...</p>
                <a href="{job.get('url', '#')}" style="color: #3182ce; text-decoration: none; font-weight: 500;">Apply Now →</a>
            </div>
            '''
            list_html.append(list_item)
        
        list_html.append('</div>')
        return ''.join(list_html)
    
    def _generate_job_table(self, jobs: List[Dict[str, Any]]) -> str:
        """Generate job table HTML for compact display"""
        if not jobs:
            return '<p>No jobs found.</p>'
        
        table_html = ['''
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: white;">
            <thead>
                <tr style="background: #f7fafc;">
                    <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-weight: 600; color: #2d3748;">Position</th>
                    <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-weight: 600; color: #2d3748;">Company</th>
                    <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-weight: 600; color: #2d3748;">Location</th>
                    <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-weight: 600; color: #2d3748;">Salary</th>
                    <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: center; font-weight: 600; color: #2d3748;">Match</th>
                    <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: center; font-weight: 600; color: #2d3748;">Apply</th>
                </tr>
            </thead>
            <tbody>
        ''']
        
        for job in jobs:
            row_html = f'''
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="border: 1px solid #e2e8f0; padding: 12px; font-weight: 500; color: #2d3748;">{job.get('title', 'Unknown')}</td>
                <td style="border: 1px solid #e2e8f0; padding: 12px; color: #4a5568;">{job.get('company', 'Unknown')}</td>
                <td style="border: 1px solid #e2e8f0; padding: 12px; color: #4a5568;">{job.get('location', 'Remote')}</td>
                <td style="border: 1px solid #e2e8f0; padding: 12px; color: #059669; font-weight: 500;">{job.get('salary', 'Competitive')}</td>
                <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: center;"><span style="background: #e8f5e8; color: #1a7a1a; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;">{job.get('match_score', 80)}%</span></td>
                <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: center;"><a href="{job.get('url', '#')}" style="background: #3182ce; color: white; padding: 6px 12px; text-decoration: none; border-radius: 4px; font-size: 12px; font-weight: 500;">Apply</a></td>
            </tr>
            '''
            table_html.append(row_html)
        
        table_html.append('</tbody></table>')
        return ''.join(table_html)
