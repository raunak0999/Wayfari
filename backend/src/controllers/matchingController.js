import { supabaseAdmin } from '../config/supabaseClient.js';

// Server-side compatibility calculation job
export const calculateServerMatchScore = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const currentUserId = req.user.id;

    const { data: userProfiles, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .in('id', [currentUserId, targetUserId]);

    if (error || !userProfiles || userProfiles.length < 2) {
      return res.status(404).json({ success: false, message: 'One or both profiles not found' });
    }

    const [user1, user2] = userProfiles;
    const hobbies1 = user1.hobbies || [];
    const hobbies2 = user2.hobbies || [];
    const sharedHobbies = hobbies1.filter(h => hobbies2.includes(h));

    const score = Math.min(99, Math.max(50, 60 + sharedHobbies.length * 10));

    res.json({
      success: true,
      compatibilityScore: score,
      sharedHobbies
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error calculating match', error: err.message });
  }
};
