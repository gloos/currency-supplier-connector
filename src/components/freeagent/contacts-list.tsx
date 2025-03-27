
import React, { useState, useEffect } from "react";
import { freeAgentApi } from "@/utils/freeagent-api";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { User, Mail, Building, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Contact {
  url: string;
  organisation_name: string;
  first_name: string;
  last_name: string;
  email: string;
  billing_email: string;
  status: string;
}

const ContactsList = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  
  const {
    data: contacts = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["freeAgentContacts"],
    queryFn: async () => {
      const contactsData = await freeAgentApi.getContacts();
      return contactsData;
    },
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load contacts",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const filteredContacts = contacts.filter((contact) => {
    const searchLower = searchTerm.toLowerCase();
    const name = `${contact.organisation_name || ''} ${contact.first_name || ''} ${contact.last_name || ''}`.toLowerCase();
    const email = `${contact.email || ''} ${contact.billing_email || ''}`.toLowerCase();
    
    return name.includes(searchLower) || email.includes(searchLower);
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>FreeAgent Contacts</CardTitle>
          <CardDescription>
            View and search all suppliers and contacts from your FreeAgent account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {filteredContacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "No contacts match your search" : "No contacts found"}
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContacts.map((contact) => (
                        <TableRow key={contact.url}>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              {contact.organisation_name ? (
                                <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                              ) : (
                                <User className="h-4 w-4 mr-2 text-muted-foreground" />
                              )}
                              <span>
                                {contact.organisation_name || 
                                 `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 
                                 "Unknown"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span>
                                {contact.email || contact.billing_email || "-"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              contact.status === "active" 
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                            }`}>
                              {contact.status || "unknown"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactsList;
