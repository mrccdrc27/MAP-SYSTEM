"""
WebSocket Test Client for Comment Notifications

This script tests all comment WebSocket functionality including:
- Comment creation, updates, deletion
- Comment replies and ratings
- Document attachments and detachments
- Real-time notifications

Usage: python test_websocket_comments.py <ticket_id>
"""

import asyncio
import websockets
import json
import sys
from datetime import datetime


class CommentWebSocketTester:
    def __init__(self, ticket_id, websocket_url="ws://localhost:8005"):
        self.ticket_id = ticket_id
        self.websocket_url = f"{websocket_url}/ws/comments/{ticket_id}/"
        self.websocket = None
        self.received_messages = []
        
    async def connect(self):
        """Connect to the WebSocket"""
        try:
            self.websocket = await websockets.connect(self.websocket_url)
            print(f"✅ Connected to WebSocket: {self.websocket_url}")
            return True
        except Exception as e:
            print(f"❌ Failed to connect to WebSocket: {e}")
            return False
    
    async def disconnect(self):
        """Disconnect from the WebSocket"""
        if self.websocket:
            await self.websocket.close()
            print("🔌 Disconnected from WebSocket")
    
    async def listen_for_messages(self, duration=30):
        """Listen for WebSocket messages for a specified duration"""
        print(f"👂 Listening for messages for {duration} seconds...")
        
        try:
            while True:
                # Wait for message with timeout
                message = await asyncio.wait_for(
                    self.websocket.recv(), 
                    timeout=duration
                )
                
                data = json.loads(message)
                timestamp = datetime.now().strftime("%H:%M:%S")
                
                print(f"\n📨 [{timestamp}] Received WebSocket message:")
                print(f"   Type: {data.get('type', 'unknown')}")
                print(f"   Action: {data.get('action', 'none')}")
                
                if 'comment' in data:
                    comment = data['comment']
                    print(f"   Comment ID: {comment.get('id', 'unknown')}")
                    print(f"   Text: {comment.get('text', 'no text')[:50]}...")
                    
                if 'deleted_comment_id' in data:
                    print(f"   Deleted Comment ID: {data['deleted_comment_id']}")
                    
                if 'rating_data' in data:
                    rating = data['rating_data']
                    print(f"   Rating: {rating.get('rating', 'unknown')} by {rating.get('user_id', 'unknown')}")
                    
                if 'document_info' in data:
                    doc_info = data['document_info']
                    print(f"   Document Info: {doc_info}")
                
                self.received_messages.append(data)
                
        except asyncio.TimeoutError:
            print(f"⏰ Listening timeout after {duration} seconds")
        except websockets.exceptions.ConnectionClosed:
            print("🔌 WebSocket connection closed")
        except Exception as e:
            print(f"❌ Error listening for messages: {e}")
    
    async def send_ping(self):
        """Send a ping message to test connection"""
        if not self.websocket:
            print("❌ WebSocket not connected")
            return
            
        ping_message = {
            "type": "ping",
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            await self.websocket.send(json.dumps(ping_message))
            print("🏓 Sent ping message")
        except Exception as e:
            print(f"❌ Failed to send ping: {e}")
    
    async def subscribe_to_updates(self):
        """Subscribe to comment updates"""
        if not self.websocket:
            print("❌ WebSocket not connected")
            return
            
        subscribe_message = {
            "type": "subscribe"
        }
        
        try:
            await self.websocket.send(json.dumps(subscribe_message))
            print("📬 Subscribed to comment updates")
        except Exception as e:
            print(f"❌ Failed to subscribe: {e}")
    
    def print_summary(self):
        """Print a summary of received messages"""
        print(f"\n📊 SUMMARY: Received {len(self.received_messages)} messages")
        
        action_counts = {}
        for msg in self.received_messages:
            action = msg.get('action', 'unknown')
            action_counts[action] = action_counts.get(action, 0) + 1
        
        for action, count in action_counts.items():
            print(f"   {action}: {count} messages")


async def test_websocket_connection(ticket_id):
    """Test WebSocket connection and message handling"""
    tester = CommentWebSocketTester(ticket_id)
    
    # Connect to WebSocket
    if not await tester.connect():
        return
    
    try:
        # Send ping to test connection
        await tester.send_ping()
        await asyncio.sleep(1)
        
        # Subscribe to updates
        await tester.subscribe_to_updates()
        await asyncio.sleep(1)
        
        print(f"\n🎯 WebSocket is ready to receive comment notifications for ticket {ticket_id}")
        print("📝 Now perform comment actions (create, update, delete, rate, reply) in your application")
        print("   and watch for real-time WebSocket notifications here!")
        
        # Listen for messages
        await tester.listen_for_messages(duration=60)  # Listen for 1 minute
        
    finally:
        # Print summary and disconnect
        tester.print_summary()
        await tester.disconnect()


def print_usage():
    """Print usage instructions"""
    print("WebSocket Comment Tester")
    print("========================")
    print("Usage: python test_websocket_comments.py <ticket_id>")
    print("\nThis script will:")
    print("1. Connect to the comment WebSocket for the specified ticket")
    print("2. Listen for real-time comment notifications")
    print("3. Display all received WebSocket messages")
    print("\nMake sure your messaging service is running on localhost:8005")


async def main():
    if len(sys.argv) != 2:
        print_usage()
        sys.exit(1)
    
    ticket_id = sys.argv[1]
    print(f"🎯 Testing WebSocket for ticket: {ticket_id}")
    
    await test_websocket_connection(ticket_id)


if __name__ == "__main__":
    asyncio.run(main())