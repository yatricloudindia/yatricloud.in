import { motion } from "framer-motion";
import { Calendar, Award, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UserActionChoiceProps {
    onShareAchievement: () => void;
    userFullName: string;
}

export const UserActionChoice = ({ onShareAchievement, userFullName }: UserActionChoiceProps) => {
    const navigate = useNavigate();

    return (
        <div className="container mx-auto px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
            >
                <h1 className="text-3xl md:text-5xl font-bold mb-4">
                    Welcome back, <span className="text-primary">{userFullName}</span>!
                </h1>
                <p className="text-xl text-muted-foreground">What would you like to do today?</p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* Register for Events */}
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-card border-2 border-border hover:border-primary/50 rounded-3xl p-8 cursor-pointer group transition-all"
                    onClick={() => navigate('/events')}
                >
                    <div className="h-full flex flex-col items-center text-center space-y-6">
                        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center group-hover:bg-primary transition-colors text-primary-foreground">
                            <Calendar className="w-10 h-10 text-primary-foreground" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Register for Events</h2>
                            <p className="text-muted-foreground">
                                Browse upcoming workshops, hackathons, and meetups. Reserve your spot today.
                            </p>
                        </div>
                        <div className="mt-auto pt-4 flex items-center text-primary font-semibold">
                            Browse Events <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </motion.div>

                {/* Share Achievement */}
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-card border-2 border-border hover:border-primary/50 rounded-3xl p-8 cursor-pointer group transition-all"
                    onClick={onShareAchievement}
                >
                    <div className="h-full flex flex-col items-center text-center space-y-6">
                        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center group-hover:bg-primary transition-colors text-primary-foreground">
                            <Award className="w-10 h-10 text-primary-foreground" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Share Achievement</h2>
                            <p className="text-muted-foreground">
                                Passed a new certification? Add it to your profile and the Wall of Fame.
                            </p>
                        </div>
                        <div className="mt-auto pt-4 flex items-center text-primary font-semibold">
                            Add Certificate <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
