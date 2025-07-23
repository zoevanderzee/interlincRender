import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  HelpCircle,
  Book,
  FileText,
  Send,
  MessageSquare,
  LifeBuoy,
  Loader2,
  Phone,
  Mail,
  Search,
} from "lucide-react";

const supportFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  category: z.string().min(1, "Please select a category"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

const Help = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Support form
  const supportForm = useForm<z.infer<typeof supportFormSchema>>({
    resolver: zodResolver(supportFormSchema),
    defaultValues: {
      name: "",
      email: "",
      category: "",
      subject: "",
      message: "",
    },
  });

  // Handle support form submission
  const onSubmitSupport = async (values: z.infer<typeof supportFormSchema>) => {
    try {
      setIsSubmitting(true);
      
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error('Failed to submit support request');
      }
      
      toast({
        title: "Support request submitted",
        description: "We've received your message and will get back to you within 24 hours.",
      });
      
      supportForm.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error submitting your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // FAQ data
  const faqCategories = [
    {
      title: "Getting Started",
      faqs: [
        {
          question: "How do I create my first project contract?",
          answer: "Navigate to the Contracts section and click 'Create New Contract'. Select a contractor, define your project milestones with clear deliverables and deadlines, set payment amounts for each milestone, and send for contractor approval. Once accepted, work can begin."
        },
        {
          question: "How do I add a contractor to my account?",
          answer: "Go to the Contractors section and click 'Add Contractor'. Enter their email address to send an invitation, or use the unique contractor code they provide. Once they accept and complete their profile setup, they'll be available for contract creation."
        },
        {
          question: "What subscription plans are available?",
          answer: "We offer multiple business plans: Test Plan (£1/month), Standard Plan (£49.99/month), and Enterprise Plan with custom pricing. Contractors pay £5/month. Each plan includes different features and contractor limits. Visit Settings > Subscription to view and change your plan."
        },
        {
          question: "How do I upgrade my subscription?",
          answer: "Go to Settings > Subscription to view your current plan and available upgrades. Click 'Change Plan' to select a new subscription tier. Payment will be processed immediately and your new features will be activated instantly."
        }
      ]
    },
    {
      title: "Project Management",
      faqs: [
        {
          question: "How do project milestones work?",
          answer: "Milestones break your project into manageable phases with specific deliverables, deadlines, and payment amounts. When a contractor completes a milestone, you review and approve it, which automatically triggers the associated payment through our secure payment system."
        },
        {
          question: "Can I modify an active contract?",
          answer: "Yes, navigate to the contract page and click 'Edit'. Both parties must approve any changes before they take effect. All modifications are tracked and documented for compliance and transparency."
        },
        {
          question: "How do I track project progress?",
          answer: "Use the Dashboard to see an overview of all active projects. Each contract page shows detailed milestone progress, upcoming deadlines, and payment status. You'll receive notifications for important updates and deadlines."
        },
        {
          question: "What happens if a milestone isn't completed on time?",
          answer: "Overdue milestones are clearly marked in your dashboard. You can message the contractor directly, extend the deadline if needed, or take other actions. All timeline changes are documented in the contract history."
        }
      ]
    },
    {
      title: "Payments & Payment Providers",
      faqs: [
        {
          question: "What payment providers do you use?",
          answer: "We use Stripe for subscription billing and domestic payments, and Trolley for international contractor payments. Both providers are industry-leading, secure payment platforms that ensure your financial data is protected with bank-level security."
        },
        {
          question: "How are payments triggered?",
          answer: "Payments are automatically triggered when you approve a completed milestone. The system processes the payment through either Stripe or Trolley depending on the contractor's location and your payment settings. Payments typically complete within 1-3 business days."
        },
        {
          question: "How do international payments work?",
          answer: "International payments are handled through our Trolley integration, which supports over 200 countries and multiple currencies. Exchange rates are calculated in real-time and clearly displayed before payment confirmation."
        },
        {
          question: "What if a payment fails?",
          answer: "If a payment fails, you'll receive immediate notification with specific error details. Common issues include expired payment methods or insufficient funds. You can retry the payment or update your payment method in Settings > Budget."
        },
        {
          question: "How do subscription payments work?",
          answer: "Subscription payments are processed monthly through Stripe. Your subscription automatically renews unless cancelled. You can view billing history, update payment methods, and manage your subscription in Settings > Subscription."
        }
      ]
    },
    {
      title: "For Contractors",
      faqs: [
        {
          question: "How do I get started as a contractor?",
          answer: "After receiving an invitation from a business, complete your profile setup including your profile code, company information, and payment details. Businesses will use your profile code to connect with you for new projects."
        },
        {
          question: "How do I view my active projects?",
          answer: "Your contractor dashboard shows all active projects, pending earnings, and total earnings. Navigate to 'My Assignments' to see detailed project information, milestones, and deadlines for each contract."
        },
        {
          question: "How do I submit work for milestone approval?",
          answer: "Go to your assigned contract, find the milestone you've completed, and upload your deliverables or provide progress updates. The business will review and approve your work, which automatically triggers payment."
        },
        {
          question: "When will I receive payment?",
          answer: "Payments are processed automatically when businesses approve your completed milestones. Depending on your location, payments are processed through Stripe (domestic) or Trolley (international) and typically take 1-3 business days to complete."
        },
        {
          question: "How do connection requests work?",
          answer: "Businesses can send you connection requests using your unique profile code. You'll see these requests in your Connections section where you can accept or decline them. Accepted connections allow businesses to assign you to their projects."
        }
      ]
    },
    {
      title: "Data & Security",
      faqs: [
        {
          question: "How is my financial data secured?",
          answer: "All financial data is encrypted using bank-level security standards. We use 256-bit encryption for all data storage and transfer. Additionally, we maintain PCI DSS compliance and regular security audits to ensure your data remains protected."
        },
        {
          question: "Who can access my contract information?",
          answer: "Only authorized team members from the business organization and you as the assigned contractor can access contract information. All data is completely isolated between different business accounts for maximum security."
        },
        {
          question: "Can I export my data for compliance purposes?",
          answer: "Yes, all contract data, payment records, and documents can be exported in various formats (PDF, CSV, Excel) for your records or compliance requirements. Use the Export feature in the Reports section to generate these exports."
        },
        {
          question: "How long is my data retained?",
          answer: "We retain your data for as long as you maintain an active account, plus a retention period as required by applicable financial regulations. You can request data deletion for certain information by contacting our support team."
        }
      ]
    }
  ];

  // Filter FAQs based on search query
  const filteredFAQs = searchQuery.length > 0
    ? faqCategories.map(category => ({
        title: category.title,
        faqs: category.faqs.filter(faq =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(category => category.faqs.length > 0)
    : faqCategories;

  return (
    <>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-primary-900">Help & Support</h1>
        <p className="text-primary-500 mt-1">Find answers to common questions or contact our support team</p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary-400" size={18} />
        <Input
          placeholder="Search for help topics..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Help Content Tabs */}
      <Tabs defaultValue="faq" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="faq" className="flex items-center">
            <HelpCircle size={16} className="mr-2" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="documentation" className="flex items-center">
            <Book size={16} className="mr-2" />
            Documentation
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center">
            <MessageSquare size={16} className="mr-2" />
            Contact Support
          </TabsTrigger>
        </TabsList>

        {/* FAQ Tab */}
        <TabsContent value="faq">
          {filteredFAQs.length > 0 ? (
            <div className="space-y-8">
              {filteredFAQs.map((category, index) => (
                <div key={index}>
                  <h2 className="text-xl font-semibold mb-4">{category.title}</h2>
                  {category.faqs.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full space-y-2">
                      {category.faqs.map((faq, faqIndex) => (
                        <AccordionItem
                          key={faqIndex}
                          value={`${index}-${faqIndex}`}
                          className="border rounded-lg overflow-hidden"
                        >
                          <AccordionTrigger className="px-6 py-4 hover:bg-primary-50 font-medium">
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent className="px-6 py-4 text-primary-700">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <p className="text-primary-500 italic">No results found for this category.</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <HelpCircle className="mx-auto h-12 w-12 text-primary-300 mb-4" />
              <h3 className="text-lg font-medium text-primary-900 mb-2">No results found</h3>
              <p className="text-primary-500 mb-6">
                We couldn't find any FAQ that matches your search query.
              </p>
              <Button onClick={() => setSearchQuery("")} variant="outline">
                Clear Search
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Documentation Tab */}
        <TabsContent value="documentation">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border border-primary-100 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-full bg-accent-50 text-accent-500 flex items-center justify-center mb-4">
                  <FileText size={24} />
                </div>
                <h3 className="text-lg font-medium mb-2">Getting Started Guide</h3>
                <p className="text-primary-500 mb-4">
                  Learn the basics of Creativ Linc and how to set up your first project contract.
                </p>
                <Button variant="outline" className="w-full">
                  View Guide
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-primary-100 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-full bg-accent-50 text-accent-500 flex items-center justify-center mb-4">
                  <FileText size={24} />
                </div>
                <h3 className="text-lg font-medium mb-2">Project Contract Creation</h3>
                <p className="text-primary-500 mb-4">
                  Detailed documentation on creating and managing project contracts with milestones.
                </p>
                <Button variant="outline" className="w-full">
                  View Guide
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-primary-100 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-full bg-accent-50 text-accent-500 flex items-center justify-center mb-4">
                  <FileText size={24} />
                </div>
                <h3 className="text-lg font-medium mb-2">Payment Setup</h3>
                <p className="text-primary-500 mb-4">
                  Learn how to set up Stripe and Trolley payments for domestic and international contractors.
                </p>
                <Button variant="outline" className="w-full">
                  View Guide
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-primary-100 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-full bg-accent-50 text-accent-500 flex items-center justify-center mb-4">
                  <FileText size={24} />
                </div>
                <h3 className="text-lg font-medium mb-2">Contractor Management</h3>
                <p className="text-primary-500 mb-4">
                  Guidelines for onboarding and managing contractors.
                </p>
                <Button variant="outline" className="w-full">
                  View Guide
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-primary-100 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-full bg-accent-50 text-accent-500 flex items-center justify-center mb-4">
                  <FileText size={24} />
                </div>
                <h3 className="text-lg font-medium mb-2">Reporting & Analytics</h3>
                <p className="text-primary-500 mb-4">
                  Learn how to use financial reports and analytics features.
                </p>
                <Button variant="outline" className="w-full">
                  View Guide
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-primary-100 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-full bg-accent-50 text-accent-500 flex items-center justify-center mb-4">
                  <FileText size={24} />
                </div>
                <h3 className="text-lg font-medium mb-2">Contractor Guide</h3>
                <p className="text-primary-500 mb-4">
                  Complete guide for contractors including profile setup, work submissions, and payment tracking.
                </p>
                <Button variant="outline" className="w-full">
                  View Guide
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-primary-100 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-full bg-accent-50 text-accent-500 flex items-center justify-center mb-4">
                  <FileText size={24} />
                </div>
                <h3 className="text-lg font-medium mb-2">Tax & E-Invoicing Compliance</h3>
                <p className="text-primary-500 mb-4">
                  Complete overview of tax compliance and e-invoicing standards compliance including Trolley partnership compliance and audit trail documentation.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.open('/TAX_COMPLIANCE.md', '_blank')}
                >
                  View Guide
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>



        {/* Contact Support Tab */}
        <TabsContent value="contact">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Quick Help Section */}
              <Card className="border border-primary-100">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Quick Help</h2>
                  <p className="text-primary-600 mb-4">Check our most common questions first:</p>
                  <div className="grid gap-3">
                    <Button variant="outline" className="justify-start h-auto p-4 text-left">
                      <div>
                        <div className="font-medium">How do I create a new contract?</div>
                        <div className="text-sm text-primary-500">Go to Dashboard → New Contract → Fill details → Send to contractor</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="justify-start h-auto p-4 text-left">
                      <div>
                        <div className="font-medium">When will I get paid?</div>
                        <div className="text-sm text-primary-500">Payments are processed within 24 hours of milestone approval</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="justify-start h-auto p-4 text-left">
                      <div>
                        <div className="font-medium">How do I update my payment details?</div>
                        <div className="text-sm text-primary-500">Go to Wallet → Bank Details → Update Information</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="justify-start h-auto p-4 text-left">
                      <div>
                        <div className="font-medium">What are the subscription plans?</div>
                        <div className="text-sm text-primary-500">Business: £29.99-£49.99/month, Contractor: £5/month</div>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Form */}
              <Card className="border border-primary-100">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-6">Contact Support Team</h2>
                  <Form {...supportForm}>
                    <form onSubmit={supportForm.handleSubmit(onSubmitSupport)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={supportForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Your Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="John Doe" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={supportForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <Input {...field} type="email" placeholder="john.doe@example.com" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={supportForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Issue Category</FormLabel>
                            <FormControl>
                              <select {...field} className="w-full p-3 border border-primary-200 rounded-lg">
                                <option value="">Select category...</option>
                                <option value="billing">Billing & Subscription</option>
                                <option value="payments">Payments & Wallet</option>
                                <option value="contracts">Contracts & Milestones</option>
                                <option value="account">Account & Profile</option>
                                <option value="technical">Technical Issues</option>
                                <option value="general">General Questions</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={supportForm.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Brief description of your issue" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={supportForm.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Message</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Please describe your issue in detail..."
                                className="min-h-[150px] resize-none"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end">
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="mr-2 h-4 w-4" />
                              Send Message
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border border-primary-100">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-full bg-primary-50 text-primary-500 flex items-center justify-center mb-4">
                    <LifeBuoy size={24} />
                  </div>
                  <h3 className="font-medium text-lg mb-2">Priority Support</h3>
                  <p className="text-primary-500 mb-4">
                    Business and Enterprise plans include priority support with dedicated response times.
                  </p>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-primary-600">Business Plan:</span>
                      <span className="font-medium">4 hour response time</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-primary-600">Enterprise Plan:</span>
                      <span className="font-medium">1 hour response time</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-primary-100">
                <CardContent className="p-6">
                  <h3 className="font-medium text-lg mb-4">Contact Information</h3>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <Mail className="h-5 w-5 text-primary-500 mr-3 mt-0.5" />
                      <div>
                        <p className="font-medium">Email Support</p>
                        <p className="text-primary-500">support@creativlinc.com</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Phone className="h-5 w-5 text-primary-500 mr-3 mt-0.5" />
                      <div>
                        <p className="font-medium">Phone Support</p>
                        <p className="text-primary-500">+1 (800) 555-1234</p>
                        <p className="text-xs text-primary-400">
                          Monday - Friday, 9am - 5pm EST
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-primary-100">
                <CardContent className="p-6">
                  <h3 className="font-medium text-lg mb-4">Live Chat</h3>
                  <p className="text-primary-500 mb-4">
                    Get instant assistance from our support team through live chat.
                  </p>
                  <Button className="w-full">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Start Live Chat
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default Help;
