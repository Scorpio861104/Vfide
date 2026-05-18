import type { Meta, StoryObj } from "@storybook/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";

const meta = {
  title: "UI/Tabs",
  component: Tabs,
  tags: ["autodocs"],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <p>Account settings content goes here.</p>
      </TabsContent>
      <TabsContent value="password">
        <p>Password settings content goes here.</p>
      </TabsContent>
      <TabsContent value="notifications">
        <p>Notification preferences content goes here.</p>
      </TabsContent>
    </Tabs>
  ),
};

export const VerticalTabs: Story = {
  render: () => (
    <Tabs defaultValue="tab1" orientation="vertical" className="flex gap-4">
      <TabsList className="flex flex-col h-auto" >
        <TabsTrigger value="tab1" className="justify-start">
          Tab 1
        </TabsTrigger>
        <TabsTrigger value="tab2" className="justify-start">
          Tab 2
        </TabsTrigger>
      </TabsList>
      <div>
        <TabsContent value="tab1">Tab 1 Content</TabsContent>
        <TabsContent value="tab2">Tab 2 Content</TabsContent>
      </div>
    </Tabs>
  ),
};
