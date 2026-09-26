import { supabaseAdmin } from '../config/supabaseClient.js';

// Server-side safety check-in trigger
export const triggerSafetyCheckin = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, note } = req.body;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ last_checkin: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      return res.status(400).json({ success: false, message: 'Failed to update checkin status', error: error.message });
    }

    res.json({
      success: true,
      message: 'Safety check-in logged successfully',
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error processing check-in', error: err.message });
  }
};
