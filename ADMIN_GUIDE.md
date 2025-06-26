# Admin Guide - Bali Malayali DMC Platform

## 🔐 Admin Access

### Default Admin Credentials
- **Email**: `admin@balidc.com`
- **Password**: `admin123`
- **Access URL**: `http://localhost:8000/admin.html`

## 📋 Agent Registration & Approval Workflow

### Step 1: Agent Registration Process

1. **Agent Submits Registration**:
   - Agent fills out registration form on homepage
   - Required information includes:
     - Full Name
     - Email Address
     - Phone Number
     - Company Name
     - Business Address
     - Years of Experience
     - Specialization Areas
   - Status automatically set to "Pending"

2. **System Notifications**:
   - Registration data saved to local storage
   - Agent receives confirmation message
   - Admin gets notification in daily email summary

### Step 2: Admin Review Process

1. **Access Admin Dashboard**:
   - Navigate to `http://localhost:8000/admin.html`
   - Login with admin credentials
   - Click on "Agents" tab

2. **Review Pending Registrations**:
   - View all agents with "Pending" status
   - Review agent details:
     - Contact information
     - Business credentials
     - Experience level
     - Registration date

3. **Agent Verification**:
   - Verify business legitimacy
   - Check contact details
   - Assess experience and qualifications
   - Review any additional documentation

### Step 3: Approval/Rejection Actions

#### To Approve an Agent:

1. **Click "Approve" Button**:
   - Agent status changes to "Active"
   - Agent tier set to "Bronze" (default)
   - Agent gains access to platform features

2. **Agent Notification**:
   - System sends approval notification
   - Agent can now login to dashboard
   - Access to quote builder enabled

3. **Agent Dashboard Access**:
   - Agent can access: `http://localhost:8000/dashboard.html`
   - Full platform functionality unlocked
   - Can start creating quotes immediately

#### To Reject an Agent:

1. **Click "Reject" Button**:
   - Agent status changes to "Rejected"
   - Agent cannot access platform features
   - Registration marked as declined

2. **Rejection Notification**:
   - System logs rejection reason
   - Agent receives notification of rejection
   - Can reapply with updated information

## 🎛️ Admin Dashboard Features

### Overview Statistics
- **Total Revenue**: Platform-wide earnings
- **Active Agents**: Currently approved agents
- **Total Bookings**: Confirmed reservations
- **Quotes Generated**: All quotes created
- **Conversion Rate**: Quote-to-booking ratio

### Agent Management

#### Agent Status Options:
- **Pending**: Awaiting approval
- **Active**: Approved and operational
- **Suspended**: Temporarily disabled
- **Rejected**: Application declined

#### Agent Actions:
- **View Details**: See complete agent profile
- **Approve**: Activate agent account
- **Reject**: Decline application
- **Suspend**: Temporarily disable account
- **Edit Tier**: Manually adjust agent tier

### Quote Oversight
- **View All Quotes**: Monitor platform activity
- **Quote Details**: Client info, pricing, status
- **Performance Metrics**: Success rates by agent
- **Revenue Tracking**: Commission calculations

### Booking Management
- **Confirmed Bookings**: Track successful conversions
- **Upcoming Departures**: Monitor travel dates
- **Revenue Reports**: Analyze booking trends
- **Client Information**: Manage customer data

### Package Management
- **Add New Packages**: Create travel offerings
- **Edit Existing**: Update package details
- **Pricing Control**: Manage base rates
- **Availability**: Control package visibility

## 📊 Reporting & Analytics

### Daily Admin Email
Automated daily summary includes:
- New agent registrations
- Pending approvals
- Recent bookings
- Top performing agents
- Revenue updates

### Monthly Reports
- Agent tier updates
- Performance rankings
- Revenue analysis
- Platform growth metrics

### Export Functions
- **Agent Data**: CSV export of all agents
- **Booking Reports**: Detailed booking information
- **Revenue Analysis**: Financial performance data
- **Activity Logs**: Platform usage statistics

## 🔧 Administrative Tasks

### Monthly Automation

1. **Tier Updates**:
   - System automatically evaluates agent performance
   - Updates tiers based on total passengers booked
   - Applies new discount rates

2. **Pax Counter Reset**:
   - Monthly passenger counters reset to zero
   - Allows fresh monthly tracking
   - Maintains historical data

### Agent Tier Management

#### Tier Structure:
- **Bronze**: 0-49 total pax ($5 discount per pax)
- **Silver**: 50-199 total pax ($10 discount per pax)
- **Gold**: 200-499 total pax ($15 discount per pax)
- **Platinum**: 500+ total pax ($20 discount per pax)

#### Manual Tier Adjustment:
1. Navigate to Agents tab
2. Find specific agent
3. Click "Edit" button
4. Select new tier from dropdown
5. Save changes

### Platform Monitoring

#### Key Metrics to Watch:
- **Registration Rate**: New agent signups
- **Approval Rate**: Percentage of approved agents
- **Quote Generation**: Platform usage activity
- **Conversion Rate**: Quote-to-booking success
- **Revenue Growth**: Platform earnings trend

#### Red Flags to Monitor:
- Suspicious registration patterns
- Unusual quote volumes
- Low conversion rates
- Agent complaints or issues
- Technical errors or bugs

## 🛡️ Security & Best Practices

### Agent Verification
- Verify business registration
- Check professional credentials
- Validate contact information
- Review experience claims
- Assess market reputation

### Platform Security
- Regular data backups
- Monitor for suspicious activity
- Protect sensitive information
- Maintain audit trails
- Secure admin access

### Quality Control
- Review quote quality
- Monitor client feedback
- Ensure professional standards
- Address agent concerns
- Maintain platform reputation

## 📞 Support & Escalation

### Agent Support Issues
- Technical problems
- Account access issues
- Quote generation errors
- Payment/commission queries
- Training requests

### Escalation Process
1. **Level 1**: Admin dashboard resolution
2. **Level 2**: Direct agent communication
3. **Level 3**: Technical support involvement
4. **Level 4**: Management escalation

### Contact Information
- **Admin Email**: admin@balidc.com
- **Support WhatsApp**: +62 123 456 7890
- **Emergency Contact**: Available 24/7

## 🔄 Regular Maintenance

### Daily Tasks
- Review new registrations
- Monitor platform activity
- Check for technical issues
- Respond to agent queries
- Update system status

### Weekly Tasks
- Generate performance reports
- Review agent feedback
- Update package information
- Analyze conversion trends
- Plan improvements

### Monthly Tasks
- Process tier updates
- Generate comprehensive reports
- Review platform metrics
- Plan strategic initiatives
- Conduct system maintenance

---

## 🚀 Quick Start Checklist

### For New Admins:

- [ ] Access admin dashboard with provided credentials
- [ ] Review pending agent registrations
- [ ] Understand approval/rejection process
- [ ] Familiarize with dashboard features
- [ ] Set up daily monitoring routine
- [ ] Configure notification preferences
- [ ] Review platform policies
- [ ] Test all admin functions
- [ ] Establish support procedures
- [ ] Document any issues or questions

### Daily Admin Routine:

- [ ] Check new agent registrations
- [ ] Review and process pending approvals
- [ ] Monitor platform statistics
- [ ] Check for technical issues
- [ ] Respond to agent inquiries
- [ ] Update system status
- [ ] Generate daily reports
- [ ] Plan next day activities

---

**Remember**: The admin role is crucial for maintaining platform quality and agent satisfaction. Always prioritize thorough verification while ensuring timely responses to agent applications.