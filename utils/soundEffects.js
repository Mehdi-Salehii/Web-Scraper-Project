import notifier from "node-notifier";

const notification = () => {
  notifier.notify({
    title: "Web Scraper",
    message: "Scraping completed!",
    sound: true,
  });
};

export default notification;
